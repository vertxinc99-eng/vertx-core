# VERTX CORE v6.1 NOVA FLOW FIX

- iPhone/Safariで古い app.js / style.css が残る問題を避けるため、アセットURLに v6.1.0 を付与
- 会社作成RPC成功後は membership 再読込を待たず、会社作成画面を即閉じてCOREを起動
- クラウドデータ再読込はバックグラウンド化し、失敗しても会社作成画面へ戻さない
- Vercelでトップページを no-store にして更新反映を安定化
