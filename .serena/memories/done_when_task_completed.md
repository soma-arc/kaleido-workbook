# DoD（タスク完了の判定）

- テスト: 受け入れ・ユニット・プロパティが全て Green。Coverage provider は v8。
- 契約順守: API シグネチャ/返却規約（順序・分類）が README と一致。
- TODO 更新: 該当項目を同一コミットで `[x]` に更新（運用は Issue 正）。
- 品質ゲート: `pnpm typecheck` / `pnpm lint` / `pnpm format` / `pnpm test` を通過。
- コミット: 1 タスク = 1 コミット。小さく焦点化し、受け入れテストは変更しない。
