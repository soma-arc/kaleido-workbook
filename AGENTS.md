# AGENTS（ルールの核）

本プロジェクトは PoC として「Poincaré 円板: 三鏡型 (p,q,r)／ジオデシック／角度スナップ／群展開／共役操作」を最小構成で検証します。役割詳細は docs/ROADMAP.md と各 Epic を参照し、本書ではルールの核のみを定義します。

- タイムゾーン: Asia/Tokyo
- 原則: シンプル・小さく作り速く回す（3分原則）
- ツール: TypeScript + React + Vite + pnpm / Canvas 2D / Biome(4スペース) / Vitest(coverage v8) / GitHub Actions

## 作業範囲（Scope）
- 触ってよい: `src/geom/**`, `tests/unit/**`, `tests/property/**`, `README.md`, `AGENTS.md`, `TODO.md`
- 読み取り専用: `tests/acceptance/**`（仕様ロック／人間が作成）
- 触らない: ビルド/CI 設定やワークフロー変更（別PRで合意のうえ実施）

## TDD ルール
- Red → Green → Refactor を徹底。
- 受け入れテストはロック。AI/エージェントは変更しない。
- 最初の対象: circle×circle
  - API: `circleCircleIntersection(a: Circle, b: Circle): IntersectResult`
  - 返却: `kind in {'none','tangent','two','concentric','coincident'}` と `points?`
  - 2点は x→y の昇順（安定ソート）
- プロパティテスト: fast-check（@fast-check/vitest）
  - 性質: 両円を満たす、回転/並進/一様スケール不変、入力順対称
  - 既定: `seed=424242`, `numRuns=200`（`vitest.setup.ts`。環境変数で上書き可）
- 近接数値: 比較は `toBeCloseTo(..., 12)` を基準（許容誤差はテスト側で定義）

## 禁止事項
- `tests/acceptance/**` の変更・削除・緩和
- 許容誤差や判定条件の無説明な改変
- Green のための恣意的なテスト改変

## DoD（Definition of Done）
- 受け入れ・ユニット・プロパティが全て Green（coverage v8）
- API シグネチャ/返却規約（順序・分類）が README と一致
- TODO（スプリント）の該当項目を同一コミットで [x] に更新

## コミット/PR ポリシー（最小）
- 1 タスク = 1 コミット（束ねない）
- pre-commit: `pnpm lint` / `pnpm format` / `pnpm test` を実行し失敗時ブロック
- pre-push: 少なくとも `pnpm test`（または `pnpm test:sandbox`）
- CI: typecheck / biome(lint/format-check) / test(coverage v8)

## 参照
- docs/ROADMAP.md（Now/Next/Later）
- README.md（クイックスタート/コマンド）
- TODO.md（スプリントの Now/Next/Later。Issue を正とする）

メタ: 本書は TDD 方針へのピボット（2025-09-04）を反映。
メタ: Serena メモリを最新ルールに同期（2025-09-07）。
