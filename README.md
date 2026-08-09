# VERTX CORE v4.0.3 SaaS

足場会社向けクラウド業務アプリ v4.0。v3.1の会社別Supabaseクラウドを引き継ぎます。

## v4.0追加
- 音声オーダー（対応ブラウザではWeb Speech API、文字入力でも利用可）
- 現場写真AI（既存OpenAI API接続を利用）
- 現場ダッシュボード
- 注文・重量・配車の分析画面
- メンバー/権限画面
- Free / Standard / Pro のサブスク基盤UI
- organizations に plan / subscription_status / trial_ends_at を追加するSQL
- 資材重複整理：軽量足場板をアルミ足場板へ統一、ロック付連結ピンを初期一覧から除外
- 既存の複数図面AI、自動在庫、現場在庫重量、配車、PDF/LINE、会社別クラウドを維持

## 更新方法
1. GitHubへZIPの中身をフォルダ構成ごと上書き
2. Supabase SQL Editorで `SUPABASE_V4_MIGRATION.sql` を1回実行
3. Vercelが自動デプロイ（またはRedeploy）

## サブスクについて
このv4.0は契約状態を持てる土台まで。実際のカード課金はまだ接続していないため、勝手に課金されません。


## v4.0.3 音声入力修正
- Chrome/Edge等: Web Speech APIで日本語認識
- iPhone/Safari等: マイク録音 → `/api/transcribe` → OpenAI文字起こしへ自動フォールバック
- 認識後、資材名＋数量を注文候補へ自動反映
- `アンチ1.8を50枚、枠600を30枚` 等の現場表現に対応
