# TODO / Roadmap

運用ルール: 実装が終わったら本チェックリストの該当タスクを [ ] → [x] に更新し、同一コミット/PRに含めて反映する（AGENTS/README と整合）。
追加ルール: 1 タスク完了ごとに単独コミットを作成（1 タスク = 1 コミット）。複数タスクをまとめない。例: `docs(todo): check M1 tests config`。

本プロジェクトは TDD 方針で「Geometry Core」を先行実装し、その後にアプリ本体（Canvas/React）を構築します。詳細は `README.md` と `AGENTS.md` に準拠します。

---

## Part A. Geometry Core（TDD Roadmap）

Phase 0: スケルトン

- `src/geom/types.ts`（`Vec {x,y}` / `Circle {c:Vec,r:number}` / `IntersectResult {kind:..., points?:Vec[]}`）を確認
- `src/geom/circle.ts` に空実装を置く（TDD 開始点）
- 関数シグネチャを定義: `circleCircleIntersection(a: Circle, b: Circle): IntersectResult`
- テスト基盤: Vitest（coverage provider: v8）+ fast-check を導入

Phase 1: Acceptance（人間が作成、ロック）

- 代表 6 ケースを `tests/acceptance/**` に追加（エージェントは変更不可）
  - 分離（none）
  - 外接（tangent, 一点）
  - 内接（tangent, 一点）
  - 二交点（two, 例：r=5 と r=5, 中心距離 8 → (4, ±3)）
  - 同心（concentric）
  - 同一（coincident）

Phase 2: Unit（エージェント）

- `tests/unit/**` に小さな Red を追加 → 実装 → Green を反復
- `kind` 判定のユニットから着手（`none | tangent | two | concentric | coincident`）
- `points` 実装（2 点は x→y の昇順で返す。安定ソート）
- ヘルパ抽出と数式コメントの整備

Phase 3: Property（エージェント）

- `tests/property/**` に fast-check を用いた性質テストを追加
- 交点が両円の方程式を満たす（残差チェック、シード固定、`numRuns=200`）
- 変換不変（回転・並進・一様スケール）
- 入力順対称性（`circleCircleIntersection(a,b) ≡ circleCircleIntersection(b,a)`）
- 近接数値は `toBeCloseTo(value, 12)` を基準（必要な許容誤差はテスト側で定義）

Phase 4: リファクタ & ドキュメント

- 数式の根拠と分岐条件を JSDoc に記述
- README の API・返却規約（kind/points/順序）との整合確認
- AGENTS.md の DoD に準拠（受け入れテストは変更しない）

Phase 5: 次の題材（任意で拡張）

- Circle × Line / Line × Line
- 変換ユーティリティ（回転・並進・スケール）

---

## Part A Milestone Tasks（TDD, file-scoped）

M1 Setup & Acceptance（Red 準備まで）
- [x] install dependencies — `pnpm i` DoD: 依存が解決し `pnpm test` が起動する。
- [x] tests config: vitest include globs — `vitest.config.ts` DoD: `pnpm test`（制限環境では `pnpm test:sandbox`）が 0 テストで成功起動する。
- [x] package scripts: add test/coverage/typecheck — `package.json` DoD: `pnpm test`（制限環境では `pnpm test:sandbox`）が Vitest を実行する。
- [x] geometry types: define `Vec/Circle/IntersectResult` — `src/geom/types.ts` DoD: 型エラーなくインポートできる。
- [x] API skeleton: export `circleCircleIntersection(a: Circle, b: Circle)` — `src/geom/circle.ts` DoD: 署名どおりのスタブをエクスポート。
- [x] unit test (Red): none-case classification — `tests/unit/geom/circle.kind-none.test.ts` DoD: 現状実装で失敗する。
- [x] unit test (Red): tangent external-case classification — `tests/unit/geom/circle.kind-tangent.test.ts` DoD: 現状実装で失敗する。
- [x] Biome config: add 4-space formatter/linter — `biome.json` DoD: 4スペース/formatter有効の設定が反映される。
- [x] Install Biome — `pnpm i -D @biomejs/biome` DoD: `pnpm biome --version` で確認できる。
- [x] Run format — `pnpm format` DoD: 差分が整形されコミットされる。

M2 Kind 判定（ユニット, Red→Green）
- [x] kind none (Green): implement none detection — `src/geom/circle.ts` DoD: none テストが通る（他は未着手でも可）。
- [x] kind tangent (Green): implement tangent detection — `src/geom/circle.ts` DoD: tangent テストが通る。
- [x] unit test (Red): two-case classification — `tests/unit/geom/circle.kind-two.test.ts` DoD: 現状実装で失敗する。
 - [x] kind two (Green): implement two classification — `src/geom/circle.ts` DoD: two テストが通る。
- [x] unit test (Red): concentric-case — `tests/unit/geom/circle.kind-concentric.test.ts` DoD: 現状実装で失敗する。
 - [x] kind concentric (Green): implement concentric detection — `src/geom/circle.ts` DoD: concentric テストが通る。
- [x] unit test (Red): coincident-case — `tests/unit/geom/circle.kind-coincident.test.ts` DoD: 現状実装で失敗する。
 - [x] kind coincident (Green): implement coincident detection — `src/geom/circle.ts` DoD: coincident テストが通る。
- [x] refactor: extract kind guards — `src/geom/circle.ts` DoD: 振る舞い不変でテスト緑のまま。

M3 座標計算（ユニット, Red→Green）
- [x] unit test (Red): two points sample (r=5,r=5,d=8→(4,±3)) — `tests/unit/geom/circle.points-two.test.ts` DoD: 座標不一致で失敗する。
- [x] compute points (Green): circle-circle points — `src/geom/circle.ts` DoD: two-points テストが通る。
- [x] unit test (Red): tangent single point — `tests/unit/geom/circle.point-tangent.test.ts` DoD: 現状実装で失敗する。
- [x] compute tangent point (Green): ensure single-point — `src/geom/circle.ts` DoD: tangent 点テストが通る。
- [x] stable ordering (Green): x→y comparator — `src/geom/circle.ts` DoD: 昇順を検証するアサーションが通る。
- [x] refactor: `distance`, `sortPointsAscXY` — `src/geom/circle.ts` DoD: テスト緑のまま関数抽出。

M4 プロパティテスト（Red→Green）
- [x] property: migrate to fast-check (@fast-check/vitest) — 依存追加（`pnpm add -D fast-check @fast-check/vitest`）、`tests/property/circle.properties.test.ts` を `test.prop([...], {seed,numRuns})` + `fc.*` で置換、`vitest.setup.ts` に `fc.configureGlobal({ seed: 固定, numRuns: 200 })` を設定。DoD: 既存ループ削除・プロパティはfast-check駆動・全テストGreen（coverage v8維持）。
- [x] property: residuals satisfy both equations — 実装は `tests/property/circle.properties.test.ts` に集約（seed固定, 200 runs）。
- [x] robustness (Green): eps/clamp for residuals — `src/geom/circle.ts` DoD: h^2 微小負のゼロ化、同中心/分離・包含境界に許容（eps）を導入済。残差プロパティ（seed固定, numRuns=200）緑。
- [x] property: input order symmetry — fast-checkの `tests/property/circle.properties.test.ts` に統合済（sortで昇順化し比較）。
- [x] symmetry (Green): normalize ordering — `src/geom/circle.ts` DoD: `sortPointsAscXY` により常に x→y 昇順で返却、対称性プロパティが緑。
- [ ] property (Red): transform invariance — `tests/property/circle.transform-invariance.property.test.ts` DoD: スケールで失敗。
- [ ] invariance (Green): scale-aware tolerance — `src/geom/circle.ts` DoD: 変換不変プロパティが緑。

M5 ロバスト化 & リファクタ
- [x] tolerance surface centralize — `src/geom/types.ts`, `src/geom/circle.ts` DoD: `Tolerance/defaultTol/tolValue/eqTol` を導入し、同中心/境界比較に適用。全テスト緑。
- [x] radius/NaN guard & normalize — `src/geom/circle.ts` DoD: 非有限/非正の半径・座標をガード。半径はabs正規化、無効入力はkind none。全テスト緑。
- [x] JSDoc 数式と分岐根拠 — `src/geom/circle.ts` DoD: 定義/分類/数値注意点（tol, clamp,順序）をJSDocに追記。テスト緑。
- [ ] test helpers dedup — `tests/unit/geom/circle.points-two.test.ts`, `tests/property/*` DoD: 重複ヘルパ整理後もテスト緑。

M6 ドキュメント
- [ ] README sync（API/TDD/順序） — `README.md` DoD: API 署名/返却規約/順序を最新に反映。
- [ ] AGENTS sync（DoD/禁止/範囲） — `AGENTS.md` DoD: 現行方針と一致。
- [ ] TODO checkpoint 更新 — `TODO.md` DoD: 進捗に合わせてチェック済みに更新。

---

新規作成が必要なファイル一覧
- `src/geom/types.ts`
- `src/geom/circle.ts`
- `tests/unit/geom/circle.kind-none.test.ts`
- `tests/unit/geom/circle.kind-tangent.test.ts`
- `tests/unit/geom/circle.kind-two.test.ts`
- `tests/unit/geom/circle.kind-concentric.test.ts`
- `tests/unit/geom/circle.kind-coincident.test.ts`
- `tests/unit/geom/circle.points-two.test.ts`
- `tests/unit/geom/circle.point-tangent.test.ts`
- `tests/property/circle.residual.property.test.ts`
- `tests/property/circle.symmetry.property.test.ts`
- `tests/property/circle.transform-invariance.property.test.ts`

既存を編集するだけのファイル一覧
- `README.md`
- `AGENTS.md`
- `TODO.md`
- `package.json`
- `vitest.config.ts`

## Part B. アプリ本体（React + Canvas 2D）

MILESTONE-B0: 雛形/CI/ツールチェーン

- Vite + React + TypeScript の雛形（`pnpm i && pnpm dev` で 3 分以内起動）
- Biome 設定（lint/format、インデント 4 スペース）+ TypeScript 厳格化（`strict: true`）
- Vitest + coverage v8、fast-check をプロジェクト全体に適用
- GitHub Actions: `typecheck` + `biome` + `test`（coverage v8）
- Git hooks: pre-commit（lint/format/test）、pre-push（test）

AC:
- `pnpm typecheck`/`pnpm lint`/`pnpm test`（制限環境では `pnpm test:sandbox`）が安定して成功
- 失敗時は pre-commit でブロックされる

MILESTONE-B1: キャンバス基盤と座標系

- `src/engine/render.ts` に描画ループの骨格（requestAnimationFrame）
- DPI 対応（`devicePixelRatio`）、座標変換ユーティリティ
- 再描画最適化の方針（領域限定・バッチ描画）の下地

AC:
- 60fps 目標でのスムーズなキャンバス更新（開発マシン相当）

MILESTONE-B2: UI コントロール

- `src/ui/controls.tsx`: (p,q,r) 入力、角度ピッカー、深さスライダ、共役ハンドル（z0/θ）
- アクセシビリティ最低限（キーボード操作/コントラスト）

AC:
- 各入力が状態に反映され、HUD で確認可能

MILESTONE-B3: ジオデシック生成

- 境界上 2 点クリック → 境界直交円弧（直径は直線）
- 交点角度の計算/表示、スナップ（π/n、90°、接）トグルと可視化

AC:
- 入力からジオデシックが一意に生成され、スナップ状態が色/ラベルで明確

MILESTONE-B4: 群展開と描画最適化

- 反射生成を BFS で深さ D まで適用（直前鏡への戻り抑止）
- カリング（画面外/極小プリミティブ）とバッチ描画で負荷低減

AC:
- 深さスライダに応じて要素数が増減し、体感パフォーマンスが良好

MILESTONE-B5: スクリーンショット/プリセット

- PNG 出力（任意で SVG）
- よく使う (p,q,r) プリセット

AC:
- ワンクリックで PNG 保存、プリセット切替で再現性ある状態復元

MILESTONE-B6: ドキュメント/整備

- README にコマンド/方針/TDD 手順の反映
- コーディング規約・スクリプト表の整合
- 主要操作の手順書（短 GIF など）

---

## 受け入れ条件（総括）

- Geometry Core: 受け入れ/ユニット/プロパティが Green、`circleCircleIntersection` の API と返却規約（kind/points/順序）を満たす
- アプリ本体: 3 分原則を満たし、MVP 要件（クリック→ジオデシック、角度ラベル/スナップ、(p,q,r) 展開、共役操作、PNG 出力）を満たす
