const MAX_BYTES = 4 * 1024 * 1024;

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
    const { filename, mimeType, dataBase64, mode = 'auto', context = '', materialNames = [] } = body;
    if (!filename || !dataBase64) return send(res, 400, { error: '図面データがありません' });

    const estimatedBytes = Math.floor((dataBase64.length * 3) / 4);
    if (estimatedBytes > MAX_BYTES) return send(res, 413, { error: 'AI解析は4MB以下の図面にしてください。大きいPDFは必要ページを画像で保存して解析してください。' });

    const mime = mimeType || (String(filename).toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const isPdf = mime === 'application/pdf' || String(filename).toLowerCase().endsWith('.pdf');
    const dataUrl = `data:${mime};base64,${dataBase64}`;
    const catalog = Array.isArray(materialNames) ? materialNames.slice(0, 450).join(' / ') : '';

    const instructions = `あなたは日本の仮設足場、とくに解体現場の枠組足場・単管足場の資材拾いを補助する専門アシスタントです。\n図面に明示された寸法、凡例、注記、立面・断面を読み、確認できる範囲だけから資材候補を出してください。\n数量が図面から確定できないものは無理に断定せず confidence を下げ、reason に根拠と不確実性を書いてください。\n優先対象: 建枠、調整枠、筋違/ブレス、鋼製布板/アンチ、手摺/下さん、ジャッキベース、固定ベース、単管パイプ、直交/自在クランプ、ブラケット、壁つなぎ、防音パネル、透過パネル、メッシュシート、朝顔、階段/タラップ、かんざしパイプ。\n安全上、AI結果は候補であり発注確定ではありません。\n可能なら material_name はユーザーの資材マスタ名に近い表記を使ってください。`;

    const content = [
      { type: 'input_text', text: `解析モード: ${mode}\n現場メモ: ${context || 'なし'}\n利用中の資材マスタ候補: ${catalog || '未指定'}\nこの図面から、足場タイプ・読み取れた寸法・資材候補と数量・根拠・注意点を抽出してください。` }
    ];
    if (isPdf) content.push({ type: 'input_file', filename, file_data: dataUrl });
    else content.push({ type: 'input_image', image_url: dataUrl, detail: 'high' });

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-5',
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

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) return send(res, r.status, { error: data?.error?.message || 'OpenAI APIでエラーが発生しました' });

    const text = extractOutputText(data);
    if (!text) return send(res, 502, { error: 'AI解析結果を取得できませんでした' });
    let analysis;
    try { analysis = JSON.parse(text); }
    catch { return send(res, 502, { error: 'AI解析結果の形式を読み取れませんでした', raw: text.slice(0, 500) }); }
    return send(res, 200, { analysis });
  } catch (e) {
    return send(res, 500, { error: e?.message || 'サーバーエラー' });
  }
};
