-- VERTX CORE v3.1 CLOUD / Supabase setup
-- Run this once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.tenant_store (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id,key)
);

create table if not exists public.drawings (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'application/octet-stream',
  size bigint not null default 0,
  storage_path text not null unique,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists tenant_store_org_idx on public.tenant_store(organization_id);
create index if not exists drawings_org_idx on public.drawings(organization_id);

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships
    where organization_id=p_org and user_id=auth.uid()
  );
$$;

create or replace function public.create_organization(p_name text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_code := upper(regexp_replace(trim(p_code),'[^A-Za-z0-9_-]','','g'));
  if length(trim(p_name)) < 1 then raise exception 'company name required'; end if;
  if length(v_code) < 2 then raise exception 'company code required'; end if;
  insert into public.organizations(name,code,owner_id)
  values(trim(p_name),v_code,auth.uid()) returning id into v_id;
  insert into public.memberships(organization_id,user_id,role)
  values(v_id,auth.uid(),'owner');
  return v_id;
end;
$$;

create or replace function public.join_organization_by_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select id into v_org from public.organizations where invite_token::text=p_token limit 1;
  if v_org is null then raise exception 'invalid invite'; end if;
  insert into public.memberships(organization_id,user_id,role)
  values(v_org,auth.uid(),'member') on conflict do nothing;
  return v_org;
end;
$$;

grant execute on function public.create_organization(text,text) to authenticated;
grant execute on function public.join_organization_by_invite(text) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

grant select on public.organizations to authenticated;
grant select,insert,update,delete on public.memberships to authenticated;
grant select,insert,update,delete on public.tenant_store to authenticated;
grant select,insert,update,delete on public.drawings to authenticated;
grant usage,select on sequence public.drawings_id_seq to authenticated;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.tenant_store enable row level security;
alter table public.drawings enable row level security;

-- Policies: drop first so this SQL can be safely rerun.
drop policy if exists "org members can read organizations" on public.organizations;
create policy "org members can read organizations" on public.organizations
for select to authenticated
using (public.is_org_member(id));

drop policy if exists "users can read own memberships" on public.memberships;
create policy "users can read own memberships" on public.memberships
for select to authenticated
using (user_id=auth.uid());

-- Membership changes are intentionally only done through security-definer RPCs.

drop policy if exists "members read tenant store" on public.tenant_store;
create policy "members read tenant store" on public.tenant_store
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "members insert tenant store" on public.tenant_store;
create policy "members insert tenant store" on public.tenant_store
for insert to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "members update tenant store" on public.tenant_store;
create policy "members update tenant store" on public.tenant_store
for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "members delete tenant store" on public.tenant_store;
create policy "members delete tenant store" on public.tenant_store
for delete to authenticated using (public.is_org_member(organization_id));

drop policy if exists "members read drawings" on public.drawings;
create policy "members read drawings" on public.drawings
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "members insert drawings" on public.drawings;
create policy "members insert drawings" on public.drawings
for insert to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "members delete drawings" on public.drawings;
create policy "members delete drawings" on public.drawings
for delete to authenticated using (public.is_org_member(organization_id));

-- Private drawings bucket (safe to rerun)
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('drawings','drawings',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "org members read drawing files" on storage.objects;
create policy "org members read drawing files" on storage.objects
for select to authenticated
using (
  bucket_id='drawings'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "org members upload drawing files" on storage.objects;
create policy "org members upload drawing files" on storage.objects
for insert to authenticated
with check (
  bucket_id='drawings'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "org members delete drawing files" on storage.objects;
create policy "org members delete drawing files" on storage.objects
for delete to authenticated
using (
  bucket_id='drawings'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);


-- v4.0 SaaS subscription-ready fields (no payment is charged by this schema)
alter table public.organizations add column if not exists plan text not null default 'standard' check (plan in ('free','standard','pro'));
alter table public.organizations add column if not exists subscription_status text not null default 'trial' check (subscription_status in ('trial','active','past_due','canceled'));
alter table public.organizations add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');
