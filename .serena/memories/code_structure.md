# コード構成と作業範囲

- ディレクトリ（主）
  - `src/geom/**` — 幾何コア（本スプリントの主対象）
  - `tests/acceptance/**` — 受け入れ（人間作成・ロック）
  - `tests/unit/**` — ユニットテスト
  - `tests/property/**` — プロパティテスト（fast-check）
  - 主要設定: `vitest.config.ts` / `vitest.setup.ts` / `biome.json` / `tsconfig.json` / `package.json`
- 作業範囲（AGENTS.md 準拠）
  - 触ってよい: `src/geom/**`, `tests/unit/**`, `tests/property/**`, `README.md`, `AGENTS.md`, `TODO.md`
  - 読み取り専用: `tests/acceptance/**`（仕様ロック）
  - 触らない: ビルド/CI 設定やワークフロー変更（別PRで合意のうえ実施）
- 参照
  - `README.md`（クイックスタート/スクリプト）
  - `AGENTS.md`（ルールの核: TDD/禁止/DoD/スコープ）
  - `TODO.md`（スプリント Now/Next/Later）
  - `docs/ROADMAP.md`（中長期 Now/Next/Later）
