-- VERTX CORE v5.5 Billing migration
alter table public.organizations add column if not exists plan text not null default 'free';
alter table public.organizations add column if not exists subscription_status text not null default 'trial';
alter table public.organizations add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');
alter table public.organizations add column if not exists billing_customer_id text;
alter table public.organizations add column if not exists billing_subscription_id text;
alter table public.organizations add column if not exists billing_period_end timestamptz;
alter table public.organizations add column if not exists cancel_at_period_end boolean not null default false;
do $$ begin
  if to_regprocedure('public.set_organization_plan(uuid,text)') is not null then
    revoke execute on function public.set_organization_plan(uuid,text) from authenticated;
  end if;
end $$;
create index if not exists organizations_billing_customer_idx on public.organizations(billing_customer_id);
create index if not exists organizations_billing_subscription_idx on public.organizations(billing_subscription_id);
