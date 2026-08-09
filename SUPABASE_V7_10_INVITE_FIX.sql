-- VERTX CORE v7.10 INVITE FLOW FIX
-- Supabase > SQL Editor で1回実行。再実行しても安全です。

create or replace function public.resolve_organization_role_invite(p_token text)
returns text
language sql
security definer
set search_path=public
stable
as $$
  select case
    when invite_token_admin::text = p_token then 'admin'
    when invite_token_member::text = p_token then 'member'
    when invite_token_viewer::text = p_token then 'viewer'
    else null
  end
  from public.organizations
  where invite_token_admin::text = p_token
     or invite_token_member::text = p_token
     or invite_token_viewer::text = p_token
  limit 1;
$$;

grant execute on function public.resolve_organization_role_invite(text) to authenticated;
notify pgrst, 'reload schema';
