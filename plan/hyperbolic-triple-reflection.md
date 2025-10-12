# Hyperbolic 三円反転シーン計画（v1.2）

## 目的
- Poincaré 円板向けに、3 本のジオデシック（円弧）から成る新ハイパーボリックシーンを追加し、既存シーン群と切り替えられるようにする。
- `(p,q,r) = (3,3,3)` に対応する交差角を共有する 3 円を描画し、反転回数に基づいた彩色でタイル状パターンを把握できるようにする。
- 反転回数に応じた彩色を実現する専用 WebGL シェーダとパイプラインを整備し、後日予定されている共役操作（双曲平面上の回転・並進）への拡張余地を残す。

## In / Out
- In: 角度指定から円の中心・半径を導出するジオデシック生成ユーティリティ、`buildHyperbolicTriangle` の警告ログ化、ハイパーボリック専用 WebGL パイプライン & フラグメントシェーダ、SceneDefinition & UI 追加、Storybook CSF3/Docs/Play、Vitest/fast-check テスト強化。
- Out: 3 本以外のジオデシックサポート、既存パイプラインの全面刷新、PBR 等の高度ライティング、CI 設定変更。

## 完了条件 (DoD)
- [ ] 新シーン ID `hyperbolic-tiling-333` が SceneRegistry に追加され、アプリ UI と Storybook から選択できる。
- [ ] 新 WebGL パイプラインが 3 本の円弧を描画し、反転回数を Uniform で受け取り彩色を制御できる（既存 Euclidean Reflection と整合するデフォルト値を採用）。
- [ ] `buildHyperbolicTriangle(3,3,3)` 呼び出し時に例外を投げず、`console.warn` を出力したうえで計算済みジオデシックをそのまま返却する（双曲条件を満たさない旨を通知）。
- [ ] 新シーン用 Storybook Docs/Controls/Play が整備され、3 円弧と反転挙動を確認できる。
- [ ] Vitest / fast-check でジオデシック計算、反転カウント、警告ハンドリングをカバーする。
- [ ] README もしくは docs にシーン概要・制限・警告時挙動を追記する。

## 要件整理
### 幾何構成
- 3 本のジオデシックは Poincaré 円板内の円弧とし、交差角が `(3,3,3)` に対応する値になるよう計算する。
- 双曲三角形条件（`1/p + 1/q + 1/r < 1`）は満たさないが、円ジオデシック自体は算出可能であるため、警告ログのみ出力しジオメトリは提供する。
- 3 円の中心・半径は初期状態では固定とし、将来の共役操作（回転・平行移動）追加に支障が無いデータ構造を選定する。
- 角度条件を満たす `Geodesic` 配列を SceneDefinition へ供給できるよう、`src/geom/triangle` または新モジュールにユーティリティを追加する。

### レンダリング / シェーダ
- `src/render/webgl/pipelines` に新パイプライン（仮称: `hyperbolicTripleReflectionPipeline`）を追加し、Scene ID `hyperbolic-tiling-333` に紐づける。
- 新フラグメントシェーダは `euclideanReflection.frag` をベースに、円ジオデシックの符号付き距離計算と反転処理をハイパーボリック向けに調整する。
- 反転回数上限、色パレット、ライン幅/フェザー値は Uniform 経由で制御し、既存 Euclidean Reflection シーンと同じ初期値を用いる。
- ビューポート変換とディスククリッピングは既存 `hyperbolicGeodesicPipeline` の実装と整合させる。

### ログ / エラーハンドリング
- `buildHyperbolicTriangle` は双曲条件を満たさない `(p,q,r)` を検出した場合に `console.warn`（例: `[HyperbolicTriangle] (p,q,r)=(3,3,3) does not satisfy hyperbolic constraint; using computed geodesics without tiling guarantees`）を出し、例外を投げない。
- そのまま計算済みのジオデシック／頂点を返して、呼び出し元で描画できるようにする。

### UI / Storybook
- SceneDefinition にラベル、説明、反転回数コントロール（Uniform 反映）を追加する。中心・半径は編集不可として UI をシンプルに保つ。
- Storybook では CSF3 形式で Docs/Controls/Play を整備し、Canvas の `aria-label` などアクセシビリティも確認する。

## 実装ステップ案
1. **コード棚卸しと仕様確定**: 既存ハイパーボリック三角形生成ロジック、Scene 定義、シェーダ構成、Storybook コンテンツを調査。
2. **ジオデシック生成ユーティリティの拡張**: `(3,3,3)` の角度指定から 3 円の中心・半径を導出する関数を実装し、Vitest + fast-check で角度成立を検証。
3. **警告ログ対応**: `buildHyperbolicTriangle` のバリデーション失敗時に例外ではなく警告 + 計算結果返却に変更し、既存テストを更新。
4. **新シーン定義**: `sceneDefinitions.ts` に `hyperbolic-tiling-333` を追加し、SceneRegistry と UI へ反映。
5. **WebGL パイプライン & シェーダ実装**: 新シェーダ・パイプラインを追加し、Uniform（ジオデシックパラメータ、反転回数、色設定など）を連携。レンダリング時のクリッピングと描画順を調整。
6. **UI / Storybook 整備**: React UI へシーン選択肢・反転回数コントロールを追加し、Storybook Docs/Controls/Play を整備。アクセシビリティ検証を実施。
7. **回帰テスト & ドキュメント**: `pnpm biome:check`, `pnpm typecheck`, `pnpm test` を実行し、README or docs を更新。

## テスト観点
- `(3,3,3)` 指定のジオデシックが期待角度を満たす。
- `buildHyperbolicTriangle(3,3,3)` で `console.warn` が出力されつつ、返却値が有効な円ジオデシックである。
- 反転回数 Uniform の変更が描画結果に反映される。
- Storybook Play で反転回数コントロール操作時の Canvas 更新が確認できる。
- ディスク外の数値誤差や反転回数上限値で描画が破綻しない。

## リスク・懸念
- `(3,3,3)` の角度条件を満たす円計算で浮動小数誤差が蓄積する可能性。
- 反転回数上限の設定が不適切だと無限ループや描画遅延を招く。
- 既存ハイパーボリック tiling ロジックが `(3,3,3)` に依存すると想定外の結果を生む可能性。
- 新シェーダが特定 GPU で非互換となるリスク。

## オープン課題
- 共役操作（回転・並進）を導入する際の API 拡張タイミングと責務分割。
