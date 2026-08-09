-- VERTX CORE v5.6 launch settings
-- Pro: 14-day trial. App-level Stripe plan prices are Standard ¥4,980/mo, Pro ¥9,800/mo.

alter table public.organizations
  alter column trial_ends_at set default (now() + interval '14 days');

update public.organizations
set trial_ends_at = now() + interval '14 days'
where subscription_status = 'trial'
  and (trial_ends_at is null or trial_ends_at > now() + interval '14 days');
