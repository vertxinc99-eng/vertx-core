export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const url=process.env.SUPABASE_URL||'';
  const anonKey=process.env.SUPABASE_ANON_KEY||'';
  res.status(200).json({url,anonKey,configured:Boolean(url&&anonKey),billingConfigured:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_STANDARD_PRICE_ID&&process.env.STRIPE_PRO_PRICE_ID&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY),standardPriceLabel:process.env.STRIPE_STANDARD_PRICE_LABEL||'¥4,980/月',proPriceLabel:process.env.STRIPE_PRO_PRICE_LABEL||'¥9,800/月'});
}
