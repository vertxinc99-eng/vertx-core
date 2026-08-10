-- VERTX CORE v7.17 SITE HUB
-- 元請け向け公開共有ページ用。Supabase SQL Editorで1回実行。
create table if not exists public.site_public_shares (
  token uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists site_public_shares_org_idx on public.site_public_shares(organization_id);
create index if not exists site_public_shares_site_idx on public.site_public_shares(organization_id,site_name);
alter table public.site_public_shares enable row level security;
grant select,insert,update on public.site_public_shares to authenticated;

drop policy if exists "members can read own site shares" on public.site_public_shares;
create policy "members can read own site shares" on public.site_public_shares for select to authenticated
using (exists(select 1 from public.memberships m where m.organization_id=site_public_shares.organization_id and m.user_id=auth.uid()));

drop policy if exists "members can insert own site shares" on public.site_public_shares;
create policy "members can insert own site shares" on public.site_public_shares for insert to authenticated
with check (exists(select 1 from public.memberships m where m.organization_id=site_public_shares.organization_id and m.user_id=auth.uid() and m.role in ('owner','admin','member')));

drop policy if exists "members can update own site shares" on public.site_public_shares;
create policy "members can update own site shares" on public.site_public_shares for update to authenticated
using (exists(select 1 from public.memberships m where m.organization_id=site_public_shares.organization_id and m.user_id=auth.uid() and m.role in ('owner','admin','member')))
with check (exists(select 1 from public.memberships m where m.organization_id=site_public_shares.organization_id and m.user_id=auth.uid() and m.role in ('owner','admin','member')));

create or replace function public.get_public_site_share(p_token uuid)
returns table(payload jsonb)
language sql
security definer
set search_path=public
as $$ select s.payload from public.site_public_shares s where s.token=p_token limit 1 $$;
revoke all on function public.get_public_site_share(uuid) from public;
grant execute on function public.get_public_site_share(uuid) to anon,authenticated;
