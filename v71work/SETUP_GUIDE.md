# VERTX CORE v3.1 CLOUD セットアップ

## 1. Supabaseプロジェクト作成
- https://supabase.com/ でプロジェクト作成
- Project Settings / API から Project URL と Publishable/anon key を確認

## 2. DB・Storage作成
- Supabase > SQL Editor
- `SUPABASE_SETUP.sql` の内容を全部貼り付けて Run

## 3. Vercel環境変数
Vercelの `vertx-core` > Environment Variables に追加:
- `SUPABASE_URL` = Supabase Project URL
- `SUPABASE_ANON_KEY` = Supabase publishable / anon key
- `OPENAI_API_KEY` = 既に設定済みのOpenAI APIキー

Production / Previewに設定して保存後、Redeploy。

## 4. 初回ログイン
- https://vertx-core.vercel.app
- メールと8文字以上のパスワードで新規登録
- Supabase側でメール確認ONの場合は確認メールのリンクを押す
- ログイン後、会社名・会社コードを入力して会社作成

## 5. 他社・社員を招待
- 会社設定 > 招待URLをコピー
- 相手に送る
- 相手は自分のメールでVERTX COREに登録/ログイン
- 招待URLを開くと同じ会社へ参加

## セキュリティ
会社データはorganization_id単位でRLS制御。別会社のユーザーはDB/API経由でも読めない設計。
図面はprivate Storage bucketに保存し、同じ会社のメンバーだけ取得可能。
