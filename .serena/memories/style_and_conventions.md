# スタイルと規約

- Lint/Format: Biome（4スペース、`biome.json` 準拠）。`pnpm lint` / `pnpm format`。
- TypeScript: `strict` 前提（`tsconfig.json`）。
- 命名: lowerCamelCase（変数/関数）、UpperCamelCase（型/コンポーネント）。
- テスト方針: TDD（Red → Green → Refactor）。
  - 受け入れテスト `tests/acceptance/**` はロック（AI/エージェントは変更不可）。
  - 近接数値は `toBeCloseTo(..., 12)` を基準。
  - `circleCircleIntersection` の返却規約（分類と点の昇順）は厳守。
- プロパティテスト（fast-check）
  - 既定: `seed=424242`, `numRuns=200`（`FC_SEED` / `FC_RUNS` で上書き）。
  - 不変量: 両円を満たす／回転・並進・一様スケール不変／入力順対称。
- 禁止事項（抜粋）
  - `tests/acceptance/**` の変更・削除・緩和。
  - 許容誤差や判定条件の無説明な改変。
  - Green のための恣意的なテスト改変。
- コミット規約（最小）
  - 1 タスク = 1 コミット（束ねない）。
  - pre-commit: `pnpm lint` / `pnpm format` / `pnpm test` を実行し失敗時ブロック。
  - pre-push: 最低 `pnpm test`（または `pnpm test:sandbox`）。
