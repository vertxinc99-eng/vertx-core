const MAX_BYTES=3.3*1024*1024;
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body))}
module.exports=async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'POST only'});
  if(!process.env.OPENAI_API_KEY)return send(res,503,{error:'OPENAI_API_KEY がVercelに設定されていません'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});const b64=String(body.dataBase64||'');
    if(!b64)return send(res,400,{error:'音声データがありません'});const buf=Buffer.from(b64,'base64');if(buf.length>MAX_BYTES)return send(res,413,{error:'録音が長すぎます。短く区切ってください'});
    const mime=String(body.mimeType||'audio/webm').split(';')[0];const ext=mime.includes('mp4')?'m4a':mime.includes('wav')?'wav':'webm';
    const fd=new FormData();fd.append('file',new Blob([buf],{type:mime}),`voice.${ext}`);fd.append('model',process.env.OPENAI_TRANSCRIBE_MODEL||'gpt-4o-mini-transcribe');fd.append('language','ja');fd.append('prompt','日本の足場資材の注文。例: 枠600、アンチ1.8、ハーフアンチ、ブレス、下さん、単管、クランプ、アルミ足場板、アドフラット、Jフック。数字と小数点を正確に。');
    const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:fd});const data=await r.json();if(!r.ok)return send(res,r.status,{error:data?.error?.message||'音声認識APIでエラーが発生しました'});return send(res,200,{text:data.text||''});
  }catch(e){return send(res,500,{error:e?.message||'音声認識サーバーエラー'})}
}
