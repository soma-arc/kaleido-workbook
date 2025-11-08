# Hyperbolic Regular n-gon Scene — Implementation Plan v0.2

## 背景
- 現行アプリは {p,q,r} 三角タイルとトリプル反射シーンのみを備え、正 {n,q} 多角形を単体で描画する経路が無い。
- WebGL パイプラインは `hyperbolicGeodesic`（線描画）と `hyperbolicTripleReflection`（反射塗り分け）のみで、正 n-gon 向けの塗りつぶし処理が存在しない。
- 旧計画ではトリプル反射パイプラインの流用を想定していたが、シェーダ特性やデータモデル制約により適合しない。

## ゴール
1. `(n, q)` から正双曲 n-gon の頂点と各辺 geodesic を生成する純粋関数を実装する。
2. n-gon 専用 WebGL パイプラインとシェーダを新設し、入力 geodesic 配列を描画できる状態にする。
3. SceneRegistry に `hyperbolic-regular-ngon` を登録し、UI から `n` / `q` を操作できるようにする（Storybook まで整備）。
4. `HyperbolicSceneHost` / RenderEngine を拡張し、シーンごとにハイパーボリック描画ビルダーを差し込めるようにする。
5. fast-check/ユニット/Storybook Play を含むテスト群で TDD を完遂し、全テスト Green（coverage v8）。

## 設計方針
### A. ジオメトリ計算
- 追加: `src/geom/polygon/hyperbolicRegular.ts`
  - `solveHyperbolicVertexRadius(n, q, opts)`：ニュートン法でユークリッド半径 ρ を求める。初期近似・収束判定・最大反復をオプション化。
  - `buildHyperbolicRegularNgon({ n, q })`：頂点 Vec2 配列と `OrientedGeodesic[]`（円 or 直径）を返す。直交条件 `|c|^2 - r^2 = 1` を厳守。
  - エラーハンドリング：双曲条件 `(n-2)(q-2) > 4` 不成立時や収束失敗時に `NgonBuildError` を投げ、UI 側で表示制御。
- テスト: `tests/unit/geom/hyperbolicRegularNgon.test.ts`
  - 固定ケース `(n,q)=(7,4)` の頂点範囲・直交検証。
  - fast-check：回転/並進/一様スケール不変性、および入力の順序対称性を検証（seed 424242, numRuns 200）。

### B. RenderScene 拡張
- `src/render/scene.ts`
  - 既存 `buildHyperbolicScene` に加え、`buildHyperbolicRegularNgonScene({ n, q }, viewport, opts)` を追加。`renderGeodesics` へ polygon edges をセットし、`tile` は省略。
- `src/ui/scenes/types.ts`
  - `hyperbolicSceneFactory?: (ctx: HyperbolicSceneFactoryContext) => HyperbolicScene` フィールドを追加。Context には viewport・textures・paramsOverride などを含める。
  - `HyperbolicParamsOverride` を discriminated union 化：`{ kind: "triangle"; params: TilingParams } | { kind: "regularNgon"; n: number; q: number }`。
- `src/render/engine.ts`
  - `GeometryRenderRequest` に `customHyperbolicScene?: HyperbolicScene` or `sceneFactory` を許容。
  - `renderScene` 内で `scene.hyperbolicSceneFactory` が存在する場合は `buildHyperbolicRegularNgonScene` を経由し、従来の三角タイルは従来通り `buildHyperbolicScene`。

### C. HyperbolicSceneHost 拡張
- `src/ui/scenes/HyperbolicSceneHost.tsx`
  - `paramsOverride` を上記 union 型へ拡張し、シーン固有 binding から受け取れるようにする。
  - `renderHyperbolicScene` で `scene.hyperbolicSceneFactory` を優先し、`kind` に応じた builder を呼び出す。従来シーンは `kind:"triangle"` を渡す。
  - `(n-2)(q-2) <= 4` や計算失敗時は描画をスキップし、aria-live で警告を表示。

### D. 新 WebGL パイプライン
- `src/render/webgl/pipelines/pipelineIds.ts` に `HYPERBOLIC_REGULAR_NGON_PIPELINE_ID` を追加。
- `src/render/webgl/pipelines/hyperbolicRegularNgonPipeline.ts`
  - `registerSceneWebGLPipeline` で新パイプラインを登録。
  - `packSceneGeodesics` 結果から線幅/フェザー処理、テクスチャ合成（必要最小限）を実装。
- シェーダ
  - `src/render/webgl/shaders/hyperbolicRegularNgon.vert/frag` を追加。
  - fragment: geodesic配列で内外判定（signed distance >=0）、body fill + outline（LINE_WIDTH, FEATHER）、テクスチャブレンド。
- `src/render/webglRenderer.ts` に新パイプライン import。

### E. シーン実装
- ディレクトリ `src/scenes/hyperbolic/regular-ngon/`
  - `constants.ts`: `N_MIN=4`, `N_MAX=64`, `Q_MIN=3`, `Q_MAX=10`, 既定 `(n=7,q=4)`、`MAX_GEOS=128` などを定義。
  - `binding.ts`: `useHyperbolicRegularNgonBinding` で `(n,q)` state, validation, `paramsOverride={ kind:"regularNgon", n, q }`, and warning message.
  - `ui/Overlay.tsx`: Embed overlay（`SceneAdd` ガイドラインの `EmbedOverlayPanel` を利用）。スライダ2本＋警告文（aria-live）。
  - `definition.tsx`: `SceneDefinition` へ `renderPipelineId: HYPERBOLIC_REGULAR_NGON_PIPELINE_ID`, `hyperbolicSceneFactory`, `showTriangleControls:false`, `controlsFactory` & `embedOverlayFactory` を指定。
- `src/ui/scenes/hyperbolicBindings.ts` に binding 分岐を追加。
- `src/ui/scenes/sceneDefinitions.tsx` へ登録し、`SCENE_IDS` 更新。

### F. UI/UX & Storybook
- `HyperbolicSceneHost` は新シーン選択時に `(p,q,r)` スライダを隠し、Embed overlay で `(n,q)` を即時反映。
- Storybook: `src/scenes/hyperbolic/regular-ngon/stories/HyperbolicRegularNgon.stories.tsx`
  - Controls + Docs + Play（n/q 変更 → Canvas 更新を `canvasAssertions` で確認）。
  - Accessibility: `axe` で警告メッセージ aria を検証。
- README/docs: シーン一覧に追加し、`scene=hyperbolic-regular-ngon` の URL 例と `(n-2)(q-2)>4` 条件を記載。

### G. テスト計画
1. **Unit / fast-check**
   - `hyperbolicRegularNgon` ジオメトリ関数。
   - `useHyperbolicRegularNgonBinding`（React Testing Library）。
2. **Integration**
   - `HyperbolicSceneHost` が `hyperbolicSceneFactory` を呼び出すパスのテスト。
   - RenderEngine が `scene.hyperbolicSceneFactory` を優先することをモックで確認。
3. **Storybook Play**
   - Controls 操作と警告表示を自動検証。CI でログ添付。
4. **Manual**
   - `pnpm dev` で embed モードを開き、n/q 変更スクショを `docs/pr/<issue>/` に保存。

### H. リスクと緩和策
- **ニュートン収束失敗**: 初期値改善 + 2段 fallback（secant／二分法）。失敗時は UI に明示。
- **Geodesic 数上限**: `N_MAX` を `MAX_UNIFORM_GEODESICS` 未満に設定し、警告表示で入力を拒否。
- **SceneHost リグレッション**: 既存シーンは `kind:"triangle"` をデフォルトにし、テストで回帰防止。
- **パフォーマンス**: Storybook では `parameters.chromatic=false`、Play でのみ描画確認し、CI 負荷を抑える。
