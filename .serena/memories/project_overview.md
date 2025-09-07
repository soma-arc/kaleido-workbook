# プロジェクト概要（hyperbolic-plane-tile-poc）

- 目的: Poincaré 円板で「三鏡 (p,q,r)／ジオデシック／角度スナップ／群展開／共役操作」を最小構成で検証する PoC。まずは幾何コアを TDD で確立してから UI/Canvas を進める。
- タイムゾーン: Asia/Tokyo
- 原則: シンプル・小さく作り速く回す（3分原則/セットアップ〜最小動作3分以内）
- 技術: TypeScript + React + Vite + pnpm / Canvas 2D / Biome(4スペース) / Vitest(coverage v8) / GitHub Actions
- 初期エピック（最初の対象）: circle × circle
  - API: `circleCircleIntersection(a: Circle, b: Circle): IntersectResult`
  - 返却: `kind in {'none','tangent','two','concentric','coincident'}` と `points?`
  - 2点時は x → y の昇順（安定ソート）
- プロパティテスト既定: fast-check（@fast-check/vitest）
  - 既定: seed=424242, numRuns=200（`vitest.setup.ts`、環境変数 `FC_SEED`/`FC_RUNS` で上書き可）
- 数値比較: 近接は `toBeCloseTo(..., 12)` を基準（許容誤差はテスト側で定義）
- メタ: TDD 方針へのピボット反映日 2025-09-04
