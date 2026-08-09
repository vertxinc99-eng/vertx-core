# VERTX CORE v7.13 RETURN SELECT FIX

- 返却重量計算の資材セレクトが空になる不具合を修正
- 未定義の isMaterialHidden() 呼び出しを削除し、資材の hidden フラグで直接判定
- 画面を開くたびに最新の資材マスタから選択肢を再生成
- 会社別の資材名変更も返却重量計算の選択肢へ即反映
- build/cache version を 7.13.0 に更新
