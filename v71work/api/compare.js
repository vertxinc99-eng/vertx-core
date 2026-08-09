const MAX_BYTES=2.0*1024*1024;
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body))}
function outputText(data){if(typeof data.output_text==='string')return data.output_text;for(const i of data.output||[])for(const p of i.content||[])if(p.type==='output_text')return p.text||'';return ''}
module.exports=async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST only'});
 if(!process.env.OPENAI_API_KEY)return send(res,503,{error:'OPENAI_API_KEY が設定されていません'});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):(req.body||{}),old=b.old,newer=b.newer;
  if(!old?.dataBase64||!newer?.dataBase64)return send(res,400,{error:'新旧2つの図面が必要です'});
  for(const f of [old,newer])if(Math.floor(f.dataBase64.length*3/4)>MAX_BYTES)return send(res,413,{error:'図面が大きすぎます。比較したいページを画像でアップロードしてください。'});
  const part=(f,label)=>{const mime=f.mimeType||'image/jpeg',url=`data:${mime};base64,${f.dataBase64}`;return [{type:'input_text',text:label+': '+f.filename},mime==='application/pdf'?{type:'input_file',filename:f.filename,file_data:url}:{type:'input_image',image_url:url,detail:'high'}]};
  const content=[{type:'input_text',text:`日本の仮設足場図面の新旧比較です。変更された足場面、スパン、段数、枠幅、アンチ、ブレス、単管、ブラケット、壁つなぎ、防音パネル、シート、朝顔、階段などを、図面で確認できる範囲だけ比較してください。現場メモ:${b.context||'なし'}`} ,...part(old,'旧図面'),...part(newer,'新図面')];
  const payload={model:process.env.OPENAI_MODEL||'gpt-5',store:false,input:[{role:'user',content}],text:{format:{type:'json_schema',name:'drawing_compare',strict:true,schema:{type:'object',additionalProperties:false,properties:{summary:{type:'string'},changes:{type:'array',items:{type:'object',additionalProperties:false,properties:{area:{type:'string'},change:{type:'string'},impact:{type:'string'}},required:['area','change','impact']}},warnings:{type:'array',items:{type:'string'}}},required:['summary','changes','warnings']}}}};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)return send(res,r.status,{error:d?.error?.message||'OpenAI API error'});const t=outputText(d);return send(res,200,{analysis:JSON.parse(t)});
 }catch(e){return send(res,500,{error:e.message||'server error'})}
}
