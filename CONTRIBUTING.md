# CONTRIBUTING

このプロジェクトへの貢献ありがとうございます。実装・運用ルールの正は `AGENTS.md` にあります。本書は日々の作業手順を簡潔にまとめたガイドです。

- タイムゾーン: Asia/Tokyo
- 原則: シンプル・小さく作り速く回す（3分原則）
- 技術: TypeScript + React + Vite + pnpm / Canvas 2D / Biome(4スペース) / Vitest(coverage v8)

## 1. 作業範囲と禁止事項（重要）
- 触ってよい: `src/geom/**`, `tests/unit/**`, `tests/property/**`, `README.md`, `AGENTS.md`, `TODO.md`
- 読み取り専用: `tests/acceptance/**`（仕様ロック／人間が作成）
- 触らない: ビルド/CI 設定やワークフロー変更（別PRで合意のうえ実施）
- 禁止: 受け入れテストの変更・削除・緩和／許容誤差や判定条件の無説明な改変／Green のための恣意的なテスト改変

## 2. セットアップと基本コマンド
前提: Node.js 22, pnpm

```bash
pnpm i
pnpm dev            # http://localhost:5173

# Quality gates
pnpm typecheck
pnpm lint && pnpm format
pnpm test           # coverage provider: v8
```

補助:
- `pnpm test:sandbox` — シングルスレッド・非並列で安定実行
- `pnpm coverage` — V8 カバレッジ

## 3. 開発フロー（TDD）
- Red → Green → Refactor を徹底。
- 最初の対象: circle×circle（幾何コア）。
  - API: `circleCircleIntersection(a: Circle, b: Circle): IntersectResult`
  - 返却: `kind in {'none','tangent','two','concentric','coincident'}` と `points?`
  - 2点は x → y の昇順（安定ソート）
- 近接数値: `toBeCloseTo(..., 12)` を基準（許容誤差はテスト側で定義）
- プロパティテスト（fast-check / @fast-check/vitest）
  - 既定: `seed=424242`, `numRuns=200`（`FC_SEED`/`FC_RUNS`で上書き可。`vitest.setup.ts`）
  - 性質: 両円を満たす、回転/並進/一様スケール不変、入力順対称

## 4. コーディング規約
- Biome 準拠（4スペース）。`pnpm lint` / `pnpm format` を通すこと。
- TypeScript は `strict` 前提。型の穴埋めよりもAPI契約の明確化を優先。
- 出力契約（kind/points/順序）を厳守。破る変更は別議論・別PR。

## 5. コミット/PR ポリシー
- 1 タスク = 1 コミット（束ねない）。小さく焦点化。
- pre-commit（手元）: `pnpm lint` / `pnpm format` / `pnpm test` を実行し、失敗時はコミットしない。
- pre-push: `pnpm test`（または `pnpm test:sandbox`）
- PR 説明に目的・最小差分・確認観点を明記。必要に応じて関連 Issue/Epic をリンク。
- `TODO.md` の該当項目は同一コミットで `[x]` に更新（Issue を正とする運用）。

### DoD（Definition of Done）
- 受け入れ・ユニット・プロパティが全て Green（coverage v8）
- API シグネチャ/返却規約（順序・分類）が README と一致
- `pnpm typecheck` / `pnpm lint` / `pnpm format` / `pnpm test` を通過
- `TODO.md` を該当箇所で `[x]` に更新

## 6. 議論・相談
- 設計変更（API 破壊／許容誤差の基準変更／ビルドやCIの変更）は必ず Issue で合意のうえ別PR。
- 迷ったら `AGENTS.md` を参照し、Issue/ディスカッションで相談してください。

## 7. ライセンス
- リポジトリの `LICENSE` に従います。

---
補足: 本ガイドは AGENTS（ルールの核）を要約したものです。詳細・更新の正は `AGENTS.md` を参照してください。
