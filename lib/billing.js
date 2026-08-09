const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function json(res,status,payload){res.status(status).json(payload)}
export function bearer(req){const h=req.headers.authorization||req.headers.Authorization||'';return String(h).replace(/^Bearer\s+/i,'').trim()}
export async function getUser(accessToken){
  if(!accessToken||!SUPABASE_URL||!SUPABASE_ANON_KEY)throw new Error('認証情報がありません');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${accessToken}`}});
  if(!r.ok)throw new Error('ログインを確認できません');return r.json();
}
export async function assertOwner(accessToken,orgId){
  const user=await getUser(accessToken);
  const r=await fetch(`${SUPABASE_URL}/rest/v1/memberships?select=role&user_id=eq.${encodeURIComponent(user.id)}&organization_id=eq.${encodeURIComponent(orgId)}&limit=1`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${accessToken}`}});
  if(!r.ok)throw new Error('会社権限を確認できません');const rows=await r.json();
  if(rows?.[0]?.role!=='owner')throw new Error('契約変更は社長アカウントのみ可能です');return user;
}
export async function serviceSelectOrganization(orgId){
  if(!SUPABASE_SERVICE_ROLE_KEY)throw new Error('SUPABASE_SERVICE_ROLE_KEY が未設定です');
  const r=await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=id,name,plan,subscription_status,billing_customer_id,billing_subscription_id&id=eq.${encodeURIComponent(orgId)}&limit=1`,{headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`}});
  if(!r.ok)throw new Error('会社契約情報を取得できません');const rows=await r.json();return rows?.[0]||null;
}
export async function serviceUpdateOrganization(orgId,patch){
  if(!SUPABASE_SERVICE_ROLE_KEY)throw new Error('SUPABASE_SERVICE_ROLE_KEY が未設定です');
  const r=await fetch(`${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(orgId)}`,{method:'PATCH',headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(patch)});
  if(!r.ok)throw new Error('会社契約情報を更新できません');
}
export async function stripePost(path,params){
  const key=process.env.STRIPE_SECRET_KEY||'';if(!key)throw new Error('STRIPE_SECRET_KEY が未設定です');
  const body=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')body.append(k,String(v))});
  const r=await fetch(`https://api.stripe.com/v1/${path}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||'Stripe API エラー');return data;
}
export async function stripeGet(path){
  const key=process.env.STRIPE_SECRET_KEY||'';if(!key)throw new Error('STRIPE_SECRET_KEY が未設定です');
  const r=await fetch(`https://api.stripe.com/v1/${path}`,{headers:{Authorization:`Bearer ${key}`}});const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||'Stripe API エラー');return data;
}
