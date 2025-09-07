# TODO（スプリント）

短期の実装は Issue ドリブンで運用します。ここにはスプリントの Now/Next/Later（最大10件/各）だけを置き、完了したら削除します。中長期は docs/ROADMAP.md を参照してください。

運用ルール
- 1 タスク = 1 コミット。完了時は同一コミットで当該チェックを [x] に更新。
- 受け入れテストはロック（`tests/acceptance/**`）。エージェントは変更しない。
- 詳細な工程や長文は Issue（Epic/Task）に記載してここからリンク。

## Now（着手中）
- [ ] geometry: circle×circle の座標計算を数値安定化（昇順安定ソート含む） #issue
- [ ] property: fast-check（seed=424242, runs=200）で不変量テスト強化 #issue
- [ ] QA: pre-commit で lint/format/test を必須化（失敗でブロック） #issue

## Next（次スプリント候補）
- [ ] UI: 角度スナップの状態可視化（色/ラベル） #issue
- [ ] Engine: BFS 群展開にカリングを追加（画面外/極小） #issue
- [ ] Docs: 主要操作の短GIFを追加 #issue

## Later（バックログ）
- [ ] (p,q,r) プリセットと PNG 保存ボタン #issue
- [ ] 共役ハンドル（z0/θ）UI の最小実装 #issue
- [ ] CI: GitHub Actions に coverage v8 レポートを保存 #issue

参照: docs/ROADMAP.md（方向性） / AGENTS.md（ルール）

