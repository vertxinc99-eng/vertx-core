import {assertOwner,bearer,json,serviceSelectOrganization,stripePost} from '../lib/billing.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{const {orgId,returnUrl}=req.body||{};await assertOwner(bearer(req),orgId);const org=await serviceSelectOrganization(orgId);if(!org?.billing_customer_id)return json(res,400,{error:'Stripe顧客情報がまだありません'});const base=(returnUrl||process.env.APP_URL||'').replace(/\/$/,'');const portal=await stripePost('billing_portal/sessions',{customer:org.billing_customer_id,return_url:`${base}/?billing=portal`});return json(res,200,{url:portal.url});}catch(e){return json(res,400,{error:e.message||'契約管理画面を開けません'});}
}
