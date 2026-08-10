const MAX_BYTES = 2.9 * 1024 * 1024;
const AI_TIMEOUT_MS = 115000;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text;
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === 'output_text' && typeof part.text === 'string') return part.text;
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'OPENAI_API_KEY がVercelに設定されていません' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { mode = 'auto', context = '', materialNames = [], learningExamples = [], companyVocabulary = [], speedMode = 'fast' } = body;
    const files = Array.isArray(body.files) && body.files.length ? body.files.slice(0, 8) : (body.filename && body.dataBase64 ? [{ filename: body.filename, mimeType: body.mimeType, dataBase64: body.dataBase64 }] : []);
    if (!files.length) return send(res, 400, { error: '図面データがありません' });
    const estimatedBytes = files.reduce((s,f)=>s+Math.floor((String(f.dataBase64||'').length*3)/4),0);
    if (estimatedBytes > MAX_BYTES) return send(res, 413, { error: '選択した図面の合計サイズが送信上限を超えています。必要な立面・断面に絞ってください。' });
    const catalog = Array.isArray(materialNames) ? materialNames.slice(0, 450).join(' / ') : '';
    const learned = Array.isArray(learningExamples) ? learningExamples.slice(0,36).map((x,i)=>{
      const final=x.final_materials || (Array.isArray(x.corrected_materials)?x.corrected_materials:x.corrected_materials?.final) || [];
      const predicted=x.predicted_materials || x.corrected_materials?.predicted || [];
      const delta=x.correction_delta || x.corrected_materials?.delta || [];
      return `類似確定例${i+1}: 種別=${String(x.source_type||'')} / 現場=${String(x.site||x.corrected_materials?.site||'')} / 足場=${String(x.scaffold_type||x.corrected_materials?.scaffold_type||'')} / 条件=${String(x.context||'なし').slice(0,260)} / AI予測=${JSON.stringify(predicted).slice(0,1300)} / 人が確定=${JSON.stringify(final).slice(0,1600)} / 修正差分=${JSON.stringify(delta).slice(0,1400)}`;
    }).join('\n') : '';

    const vocabulary = Array.isArray(companyVocabulary) ? companyVocabulary.slice(0,450).map(x=>`${String(x.name||'')} (${String(x.category||'')}) 別名:${String(x.aliases||'')}`).join(' / ') : '';

    const instructions = `あなたは日本の仮設足場の資材拾いを補助する専門AIです。特に解体現場の枠組足場・単管足場・防音養生・朝顔・仮囲いを扱います。
最重要ルール:
1. 図面に読める事実（寸法、スパン、段数、面、凡例、注記）を先に整理し、その事実から数量を計算する。推測だけで数量を作らない。
2. 平面・立面・断面・詳細図を相互照合し、同じ部材を二重計上しない。面ごとの数量→全体数量の順で考える。
3. 会社の過去確定例は「似た現場で人がAIをどう直したか」を学ぶ教材として使う。特に修正差分（AI予測→最終確定）の傾向を重視する。ただし現在図面の明示情報を上書きしない。
4. material_name は会社資材マスタの正式表示名を優先し、別名・現場呼称を正規化する。
5. 枠組足場では枠寸法(610/914/1224/1519/1829)、アンチ、ブレス、下さん、幅木、ジャッキ、階段、壁つなぎ、養生材の組合せ整合性を確認する。
6. 単管足場では単管長さ、直交/自在クランプ、ブラケット、ベース、壁つなぎ等の整合性を確認する。
7. 数量根拠が弱い部材は confidence を0.55未満にする。図面に数量根拠が無い場合 quantity=0 でもよい。reasonには不足情報を明記する。
8. confidence 0.75以上は、寸法・スパン・段数・図面注記など具体的根拠がある場合だけ。
9. 過去例と現在図面が食い違う場合は現在図面を優先し warnings に記載する。
10. AI結果は発注確定ではない。安全・荷姿・現場納まりは人が確認する。

計算時は、各資材について「何面 × 何スパン × 何段」「端部補正」「開口・階段・朝顔・防音パネル等の追加/除外」を内部で確認し、reasonには短く具体的な数量根拠を書く。`;

    const content = [
      { type: 'input_text', text: `解析モード: ${mode}\n現場メモ: ${context || 'なし'}\n利用中の資材マスタ候補: ${catalog || '未指定'}\n会社固有の呼称辞書: ${vocabulary || '未指定'}\nこの会社の過去の確定例（似る場合だけ参考にし、図面より優先しない）:\n${learned || 'なし'}\nまず図面ごとに読める寸法・面・スパン・段数・注記を整理し、その後で相互照合して数量を計算してください。同一資材は1行に統合し、平面と立面の同じ箇所を二重計上しないでください。過去の類似確定例では、AI予測と人の最終確定の差分が現在条件にも当てはまるかを確認してください。理由のない丸め・慣習数量の追加は禁止です。図面間の矛盾、読めない寸法、必要図面不足はwarningsへ。reasonには『東面12スパン×5段』のように数量根拠を具体的に示してください。` }
    ];
    for (const f of files) {
      const filename=String(f.filename||'drawing');
      const mime=f.mimeType || (filename.toLowerCase().endsWith('.pdf')?'application/pdf':'image/jpeg');
      const dataUrl=`data:${mime};base64,${f.dataBase64}`;
      const isPdf=mime==='application/pdf'||filename.toLowerCase().endsWith('.pdf');
      if(isPdf) content.push({type:'input_file',filename,file_data:dataUrl});
      else content.push({type:'input_image',image_url:dataUrl,detail:(mode==='photo'||speedMode==='fallback')?'auto':'high'});
    }

    const payload = {
      model: process.env.OPENAI_MODEL || (speedMode==='fallback' ? 'gpt-5-mini' : 'gpt-5'),
      store: false,
      instructions,
      input: [{ role: 'user', content }],
      text: {
        format: {
          type: 'json_schema',
          name: 'scaffold_drawing_analysis',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              scaffold_type: { type: 'string' },
              summary: { type: 'string' },
              dimensions: { type: 'array', items: { type: 'string' } },
              materials: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    material_name: { type: 'string' },
                    quantity: { type: 'integer', minimum: 0 },
                    unit: { type: 'string' },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    reason: { type: 'string' }
                  },
                  required: ['material_name','quantity','unit','confidence','reason']
                }
              },
              warnings: { type: 'array', items: { type: 'string' } }
            },
            required: ['scaffold_type','summary','dimensions','materials','warnings']
          }
        }
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), AI_TIMEOUT_MS);
    let r;
    try {
      r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally { clearTimeout(timer); }
    const data = await r.json();
    if (!r.ok) return send(res, r.status, { error: data?.error?.message || 'OpenAI APIでエラーが発生しました' });

    const text = extractOutputText(data);
    if (!text) return send(res, 502, { error: 'AI解析結果を取得できませんでした' });
    let analysis;
    try { analysis = JSON.parse(text); }
    catch { return send(res, 502, { error: 'AI解析結果の形式を読み取れませんでした', raw: text.slice(0, 500) }); }
    return send(res, 200, { analysis });
  } catch (e) {
    if(e?.name==='AbortError')return send(res,504,{error:'AI解析が時間内に完了しませんでした。図面を重要なものに絞って再試行してください。'});
    return send(res, 500, { error: e?.message || 'サーバーエラー' });
  }
};
