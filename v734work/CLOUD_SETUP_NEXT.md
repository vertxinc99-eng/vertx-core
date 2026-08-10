# 次の段階：本番SaaS化

推奨: Supabase

必要なもの:
1. organizations（会社）
2. profiles（ユーザー）
3. memberships（会社とユーザーの所属）
4. sites / orders / order_items / stock / materials / drawings
5. 全テーブルに organization_id
6. Row Level Securityで所属会社以外を読めないようにする
7. Supabase Authでメールログイン / 招待

これを接続すると、同じ https://vertx-core.vercel.app からログインし、会社ごとに完全に別データをクラウド共有できます。
