# VERTX CORE v5.6 - 本番サブスク開始

料金
- Free: ¥0
- Standard: ¥4,980 / 月
- Pro: ¥9,800 / 月（14日無料トライアル）

## 1. Supabase
SQL Editorで `SUPABASE_V5_6_LAUNCH_MIGRATION.sql` を1回Run。
（v5.5のBilling migrationをまだ実行していない場合は、先に `SUPABASE_V5_5_BILLING_MIGRATION.sql` をRun）

## 2. Stripe
Stripe本番モードで商品を2つ作成。
- VERTX CORE Standard / recurring / monthly / JPY 4,980
- VERTX CORE Pro / recurring / monthly / JPY 9,800

作成した各Price ID（price_...）を控える。Proの14日無料はアプリ側Checkoutで設定済み。

Customer Portalを有効化。

Webhook endpoint:
`https://vertx-core.vercel.app/api/stripe-webhook`

購読イベント:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

## 3. Vercel Environment Variables
- STRIPE_SECRET_KEY
- STRIPE_STANDARD_PRICE_ID
- STRIPE_PRO_PRICE_ID
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- APP_URL = https://vertx-core.vercel.app
- STRIPE_STANDARD_PRICE_LABEL = ¥4,980/月（任意。未設定でも表示されます）
- STRIPE_PRO_PRICE_LABEL = ¥9,800/月（任意。未設定でも表示されます）

秘密鍵はGitHubへ入れないこと。

## 4. テスト
Stripe Test modeで1回決済確認後、本番キー/本番Price IDへ切り替える。
