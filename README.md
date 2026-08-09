# VERTX CORE v3.1 CLOUD

会社別クラウド共有版。

## 追加機能
- Supabase Auth（メール＋パスワード）
- 会社作成 / 会社招待URL
- Row Level Securityで会社データを分離
- 現場 / 注文 / 在庫 / 資材マスタ / お気に入り / セット等をクラウド同期
- 図面PDF/JPG/PNGをSupabase Storageへクラウド保存
- 同じ会社ならスマホ・PC間でデータ共有
- 既存のAI図面解析、複数図面、AI比較、重量・トラック判定を維持

## 初回セットアップ
1. Supabaseでプロジェクトを作成
2. `SUPABASE_SETUP.sql` を SQL Editor で実行
3. Vercel > Environment Variables に追加
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - 既存の `OPENAI_API_KEY`
4. GitHubへこのZIPの中身を上書きしてRedeploy
5. アプリで新規登録 → 会社作成

詳細は `SETUP_GUIDE.md`。
