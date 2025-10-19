# Scene Extensibility Improvement Report

## 1. 型・ID 定義がハードコードされている問題（`src/ui/scenes/types.ts`）

### 現状課題
- `SCENE_VARIANT_GROUPS` と `SceneId` のユニオン型が手作業で更新する静的配列に依存。
- 新しいシーンを追加するたびに型定義を編集する必要があり、拡張性と安全性が乏しい。

### 改善方針
1. **シーン定義の単一ソース化**: `sceneDefinitions.ts` 側で `SceneDefinition` を配列で宣言し、型定義はその配列から `as const`/型推論で自動生成する。
2. **レジストリビルダーの導入**: `createSceneRegistry(definitions: SceneDefinition[])` のような初期化関数を用意し、`SceneId` や `SceneVariant` を同関数内の `as const` 推論から導出する。
3. **型安全なモジュール登録 API**: 上記レジストリを export し、外部モジュールが `registerScene(def)` のように追加登録できるよう拡張（将来的にプラグイン対応を検討）。

### 想定成果
- 新規シーン追加が配列へのオブジェクト追加のみで完結。
- 型の自動更新により human error を削減。

---

## 2. シーン定義/レジストリが静的配列に分散している問題（`sceneDefinitions.ts`, `registry.ts`）

### 現状課題
- `SCENE_IDS`、`SCENES_BY_GEOMETRY`、`SCENE_ORDER` 等が複数の定数に分散し、更新漏れのリスクが高い。
- ランタイムでの登録や条件による無効化ができない。

### 改善方針
1. **単一配列による定義**: `const SCENE_DEFINITIONS = [ ... ] as const;` を導入し、ID・順序・幾何分類など派生情報はユーティリティ関数で生成する。
2. **ビルドステップの集約**: `buildSceneRegistry(SCENE_DEFINITIONS)` で `byId` / `order` / `byGeometry` を一度に構築し、`registry.ts` から export。
3. **フィルタリング API の拡張**: `listScenes({ geometry?, variant?, includeDisabled? })` など、将来の動的シーン切り替えに備えた柔軟な取得インターフェースを追加。

### 想定成果
- シーン追加時に編集ポイントが1か所に統一。
- 配列生成の副産物として Storybook/ドキュメント自動更新が容易に。

---

## 3. レンダリングパイプラインがジオメトリ2種に固定されている問題（`scene.ts`, `webglRenderer.ts` ほか）

### 現状課題
- `RenderScene` ユニオンや `GeometryRenderRequest` が双曲／ユークリッドのみに対応。
- 新しいシェーダー／描画ロジックを導入する場合、既存レンダラーを直接改変する必要がある。

### 改善方針
1. **描画ドライバーの抽象化**: `RenderScene` を discriminated union ではなくインターフェース化し、`kind` ごとに `render(scene, viewport, ctx)` を委譲可能にする（例: `SceneRendererRegistry`）。
2. **WebGL パイプラインのプラガブル化**: シェーダー/ユニフォーム設定を `PipelineDescriptor` として定義し、ジオデシック／テクスチャなど複数のパイプラインを登録・切り替えられる構造にする。
3. **フォールバック戦略の整理**: Canvas 2D と WebGL の選択をシーン側が要求できるよう `RenderRequest` に `preferredPipelines` などを追加し、Spherical などの専用レンダリングを共存させる。

### 想定成果
- 新ジオメトリやデバッグシーンを追加しても既存コードとの競合が最小化。
- シェーダー追加が「パイプライン定義＋レジストリ登録」で完結する未来設計への足掛かり。

---

## 次のアクション案
1. `SCENE_DEFINITIONS` 配列化と型導出の PoC 実装。
2. レンダリング抽象レイヤーの設計プロトタイプ（ユニットテスト付き）。
3. Storybook/ドキュメント生成フローの更新（新レジストリ API に追随）。

---

## 4. 実装済み改善サマリ
- シーン定義を `BASE_SCENE_INPUTS` 配列に集約し、`SceneId`/`SceneVariant` を自動生成。
- `SCENE_REGISTRY` オブジェクトを追加し、UI 層から共通 API でシーン情報を取得可能に。
- WebGL レンダラーをパイプライン方式に刷新し、`pipelineRegistry` によるシーン単位の差し替えを実現。
- 球面シーンを同パイプライン抽象に接続し、`SphericalSceneHost` からもレジストリ経由でレンダラーを取得。
- デバッグ用途のテクスチャ表示シーン（`hyperbolic-debug-texture`）と専用パイプラインを追加し、カスタムシェーダー導入の手順をサンプル化。

---

## 5. デバッグ用シェーダ／パイプライン追加の手順例
1. **シーンを定義する**: `sceneDefinitions.ts` の `BASE_SCENE_INPUTS` に `key`, `geometry`, `variant`, `label` を持つエントリを追加する。
2. **フラグメントシェーダを作成**: 例として `src/render/webgl/shaders/debugTexture.frag` のように GLSL を保存する（`?raw` インポート想定）。
3. **パイプラインを実装**: `src/render/webgl/pipelines/` 配下に新しいクラスを追加し、`WebGLPipelineInstance` を実装。必要なバッファ／ユニフォームの初期化と描画処理を記述。
4. **レジストリへ登録**: `registerSceneWebGLPipeline(<sceneId>, <pipelineId>, factory)` を呼び、シーンID毎にパイプラインを解決できるようにする。
5. **レンダラーから利用する**: `webglRenderer.ts` でパイプラインモジュールを `import` するか、必要なホストコンポーネント内で読み込み、`resolveWebGLPipeline(scene)` を通じてインスタンス化して描画する。
6. **UI で確認**: モード切り替えから新シーンを選択し、テクスチャ選択など既存 UI コンポーネントを併用して動作を確認する。
