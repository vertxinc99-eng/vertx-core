import {assertOwner,bearer,json,serviceSelectOrganization,stripePost} from '../lib/billing.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {orgId,plan,returnUrl}=req.body||{};if(!orgId||!['standard','pro'].includes(plan))return json(res,400,{error:'プラン指定が不正です'});
    const user=await assertOwner(bearer(req),orgId);const org=await serviceSelectOrganization(orgId);if(!org)return json(res,404,{error:'会社が見つかりません'});
    const priceId=plan==='standard'?process.env.STRIPE_STANDARD_PRICE_ID:process.env.STRIPE_PRO_PRICE_ID;if(!priceId)return json(res,503,{error:`${plan.toUpperCase()} のStripe Price IDが未設定です`});
    const base=(returnUrl||process.env.APP_URL||'').replace(/\/$/,'');if(!base)return json(res,503,{error:'APP_URL が未設定です'});
    const params={mode:'subscription','line_items[0][price]':priceId,'line_items[0][quantity]':'1',client_reference_id:orgId,success_url:`${base}/?billing=success`,cancel_url:`${base}/?billing=cancel`,customer_email:org.billing_customer_id?'':(user.email||''),customer:org.billing_customer_id||'',allow_promotion_codes:'true','metadata[org_id]':orgId,'metadata[plan]':plan,'subscription_data[metadata][org_id]':orgId,'subscription_data[metadata][plan]':plan};if(plan==='pro')params['subscription_data[trial_period_days]']='14';
    const session=await stripePost('checkout/sessions',params);return json(res,200,{url:session.url});
  }catch(e){return json(res,400,{error:e.message||'決済を開始できません'});}
}
