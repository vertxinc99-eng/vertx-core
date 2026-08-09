-- VERTX CORE v4.0 migration
alter table public.organizations add column if not exists plan text not null default 'standard' check (plan in ('free','standard','pro'));
alter table public.organizations add column if not exists subscription_status text not null default 'trial' check (subscription_status in ('trial','active','past_due','canceled'));
alter table public.organizations add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');
