# よく使うコマンド（package.json 準拠）

開発/ビルド
- `pnpm i` — 依存関係インストール
- `pnpm dev` — Vite 開発サーバ（http://localhost:5173）
- `pnpm build` / `pnpm preview`

型/静的解析/整形
- `pnpm typecheck` — TypeScript 型検査
- `pnpm lint` — Biome lint（4スペース）
- `pnpm format` — Biome format（write）

テスト（Vitest, coverage v8）
- `pnpm test` — 通常実行
- `pnpm test:sandbox` — シングルスレッド/非並列の安定実行
- `pnpm coverage` — カバレッジ（provider v8）
- 既定の fast-check: `FC_SEED=424242 FC_RUNS=200`（`vitest.setup.ts`）

ユーティリティ
- ripgrep: `rg "pattern" -n` で高速検索
