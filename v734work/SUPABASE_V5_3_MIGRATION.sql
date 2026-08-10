-- VERTX CORE v5.3 TEAM INVITE + ROLE ACCESS
-- Run once in Supabase > SQL Editor. Safe to rerun.

create extension if not exists pgcrypto;

alter table public.organizations add column if not exists invite_token_admin uuid default gen_random_uuid();
alter table public.organizations add column if not exists invite_token_member uuid default gen_random_uuid();
alter table public.organizations add column if not exists invite_token_viewer uuid default gen_random_uuid();

update public.organizations set invite_token_admin=gen_random_uuid() where invite_token_admin is null;
update public.organizations set invite_token_member=gen_random_uuid() where invite_token_member is null;
update public.organizations set invite_token_viewer=gen_random_uuid() where invite_token_viewer is null;

create unique index if not exists organizations_invite_token_admin_uidx on public.organizations(invite_token_admin);
create unique index if not exists organizations_invite_token_member_uidx on public.organizations(invite_token_member);
create unique index if not exists organizations_invite_token_viewer_uidx on public.organizations(invite_token_viewer);

create or replace function public.get_organization_role_invites(p_org uuid)
returns table(admin_token text,member_token text,viewer_token text)
language plpgsql
security definer
set search_path=public
as $$
declare caller_role text;
begin
  select role into caller_role from public.memberships where organization_id=p_org and user_id=auth.uid();
  if caller_role not in ('owner','admin') then raise exception 'permission denied'; end if;
  return query
  select
    case when caller_role='owner' then o.invite_token_admin::text else null end,
    o.invite_token_member::text,
    o.invite_token_viewer::text
  from public.organizations o where o.id=p_org;
end;
$$;
grant execute on function public.get_organization_role_invites(uuid) to authenticated;

create or replace function public.join_organization_by_role_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_org uuid; v_role text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select id,
    case
      when invite_token_admin::text=p_token then 'admin'
      when invite_token_member::text=p_token then 'member'
      when invite_token_viewer::text=p_token then 'viewer'
      else null
    end
  into v_org,v_role
  from public.organizations
  where invite_token_admin::text=p_token
     or invite_token_member::text=p_token
     or invite_token_viewer::text=p_token
  limit 1;
  if v_org is null or v_role is null then raise exception 'invalid invite'; end if;

  insert into public.memberships(organization_id,user_id,role)
  values(v_org,auth.uid(),v_role)
  on conflict (organization_id,user_id) do update
    set role = case
      when public.memberships.role='owner' then 'owner'
      when public.memberships.role='admin' and v_role in ('member','viewer') then 'admin'
      else v_role
    end;
  return v_org;
end;
$$;

grant execute on function public.join_organization_by_role_invite(text) to authenticated;
notify pgrst, 'reload schema';
