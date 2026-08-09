# VERTX CORE v5.5 - Stripe subscription setup

1. Supabase SQL Editorで `SUPABASE_V5_5_BILLING_MIGRATION.sql` をRun。
2. StripeでStandard / Proの月額Priceを作成。
3. Stripe Customer Portalを有効化。
4. Webhook endpoint: `https://vertx-core.vercel.app/api/stripe-webhook`
5. Webhook events: checkout.session.completed / customer.subscription.updated / customer.subscription.deleted / invoice.paid / invoice.payment_failed
6. Vercel Environment Variables:
   - STRIPE_SECRET_KEY
   - STRIPE_STANDARD_PRICE_ID
   - STRIPE_PRO_PRICE_ID
   - STRIPE_WEBHOOK_SECRET
   - SUPABASE_SERVICE_ROLE_KEY
   - APP_URL = https://vertx-core.vercel.app
   - optional: STRIPE_STANDARD_PRICE_LABEL / STRIPE_PRO_PRICE_LABEL
7. GitHub mainへv5.5を上書き。Vercel自動デプロイ。
8. 最初はStripe Test modeで決済テスト。

秘密鍵はapp.js/index.html/GitHubへ絶対に入れない。
