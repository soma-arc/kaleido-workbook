# ハイパーボリックシーン UI リファクタリング計画（v1.1）

## 目的
- `hyperbolic-tiling-333` シーンで WebGL パイプラインの `uMaxReflections` を UI スライダから操作可能にする。
- ハイパーボリック系シーンロジックを `EuclideanSceneHost` から分離し、責務を明確化する。
- シーン定義からコントロール UI を生成できるフック/ファクトリを整備し、シーン追加時の改修範囲を最小化する。

## スコープ
- 対象ファイル: `src/ui/App.tsx`, `src/ui/scenes/**`, `src/render/engine.ts`, `src/render/webgl/**`, 必要に応じて `plan/` / `docs/`
- 非対象: `tests/acceptance/**`, Storybook 共通スタイル、CI 設定

## 背景・現状
- ハイパーボリックシーンでも `EuclideanSceneHost` を利用しており、約 1,500 行のコンポーネントが複数ジオメトリの制御を担っている。
- `hyperbolicTripleReflectionPipeline` が `uMaxReflections` を固定値で初期化し、`render` 呼び出し時に更新できない。
- シーン固有 UI は `scene.key === "…"` の分岐で毎回ホスト側へ埋め込んでおり、拡張性が低い。

## 課題と解決方針
1. **ハイパーボリック系ロジックの混在**
   - 対策: `HyperbolicSceneHost` を新設し、`App` の幾何分岐で Euclid/Sphere/Hyperbolic 三種類のホストに振り分ける。共通処理は専用フック（例: `useRenderEngine`, `useTextureInputWithPresets`）へ抽出。
2. **`uMaxReflections` の固定化**
   - 対策: `RenderEngine` / `WebGLPipelineRenderContext` に `sceneUniforms`（任意ペイロード）を追加し、ホストから slider 値を渡す。`HyperbolicTripleReflectionPipeline` は `render` 内で `uMaxReflections` を毎フレーム更新。
3. **シーンごとの UI 分岐が膨張**
   - 対策: `SceneDefinition` に `createControls(context)` / `createOverlay(context)` を追加。`hyperbolic-tiling-333` にはスライダ制御を実装し、`euclideanMultiPlane` の既存ロジックも移行。

## 実装ステップ
1. **設計整理（ドキュメント更新）**
   - 本計画を `docs/` or `plan/` に反映し、`ops/ai/prompts/v1/implement_issue.md` へ該当項目のリンクを追記（必要なら別 PR）。
2. **レンダーコンテキスト拡張**
   - `GeometryRenderRequest` に `sceneUniforms?: Record<string, unknown>` を追加。
   - `createRenderEngine` → WebGL レンダーパスで `sceneUniforms` を `WebGLPipelineRenderContext` へ受け渡し。
   - `HyperbolicTripleReflectionPipeline.render` で `sceneUniforms?.uMaxReflections` を参照し、`gl.uniform1i` を更新。
   - 単体テスト: pipeline のユニフォーム更新が呼ばれることをモック化して検証。
3. **ハイパーボリックホストの新設**
   - `src/ui/scenes/HyperbolicSceneHost.tsx` を作成し、`EuclideanSceneHost` からハイパーボリック専用処理（レンダー初期化・texture picker・triangle params 連動）を抜粋。
   - `App.tsx` で `scene.geometry === GEOMETRY_KIND.hyperbolic` の場合に新ホストを利用。
   - 影響範囲: 既存テスト / Storybook の import 修正。
4. **シーン UI ファクトリ導入**
   - `SceneDefinition` 型へ `controlsFactory?: (ctx) => ReactNode` を追加。
   - `EuclideanSceneHost` / `HyperbolicSceneHost` で `controlsFactory` を優先し、fallback を従来 UI とする。
   - `euclideanMultiPlane` と `hyperbolic-tiling-333` にスライダ制御を実装。
5. **UI 実装と状態管理**
   - `HyperbolicSceneHost` 内で slider 状態（初期値: パイプライン既定 10）を管理。
   - `SceneLayout` の embed overlay にも反映。既存 `MultiPlaneOverlayControls` の再利用を検討。
   - `renderEngine.render` 呼び出し時に `sceneUniforms` として `uMaxReflections` を渡す。
6. **回帰テスト / ドキュメント**
   - `pnpm biome:check`, `pnpm typecheck`, `pnpm test`。
   - Storybook Play: `hyperbolic-tiling-333` で slider 操作 → canvas 更新確認。
   - README / docs に slider 操作方法と制限を追記。

## 移行フェーズ計画
### フェーズA: コロケーション基盤づくり
- `src/scenes/` 配下に `hyperbolic/tiling-333/` ディレクトリを新設し、
  - `definition.ts`（SceneDefinition ラッパー）
  - `pipeline.ts`（WebGL パイプライン）
  - `ui/Controls.tsx`（Scene 専用コントロール）
  - `stories/`, `__tests__/`
  を配置するテンプレートを用意。
- SceneRegistry からは新テンプレートを import するだけにし、従来 `BASE_SCENE_INPUTS` に直接オブジェクトを記述しない。
- 先行サンプルとして `hyperbolic-tiling-333` を新構成へ移行し、ビルド／Storybook が通ることを確認。

### フェーズB: 既存シーンの段階的移行
- Euclidean 系（`multi-plane`, `circle-inversion`）から順に新テンプレートへ移動。移動ごとに動作確認と Storybook Play を実施。
- 共有コンポーネント（`ModeControls`, `TexturePicker` など）は `src/ui/components/` で維持し、シーン固有にラップする場合は `scene/ui/Controls.tsx` から import。
- `SceneDefinition` でコロケーションされた UI を `controlsFactory`/`overlayFactory` から提供し、ホスト側の条件分岐を削除。

### フェーズC: ホストのスリム化
- `EuclideanSceneHost`/`HyperbolicSceneHost` が担う責務を「render エンジン初期化」「SceneDefinition から UI を取得」に限定。
- 共通ロジックは `src/ui/scenes/hooks/` へ移動し、ホストは 200〜300 行程度を目標とする。
- Storybook を `src/scenes/**/stories/` から自動登録できるよう、`require.context` 相当のエントリポイントを整える。

### フェーズD: 追加機能・フォローアップ
- `sceneUniforms` を型安全化（ジェネリクス導入）し、バリデーションを追加。
- 共通 CLI（plop など）でシーン雛形を生成できるようにする。
- ドキュメント（README, docs/ROADMAP.md）を更新し、新しい構造でのシーン追加手順を明記。
- AI エージェント向けのシーン追加ガイドライン（`ops/ai/playbooks/scene_add_refactor.md` など）を作成し、新アーキテクチャに沿った手順を明文化。

## 検証観点
- `hyperbolic-tiling-333` シーンでスライダ操作時に WebGL uniform が更新され描画が変わる。
- `euclideanMultiPlane` の挙動が回 regress していない（スライダ・embed overlay）。
- `HyperbolicSceneHost` と `EuclideanSceneHost` のレンダー処理が独立して動作する。

## リスク・懸念
- ホスト分割による props / hooks の重複。→ 共通フック化で抑制。
- `sceneUniforms` の導入が他パイプラインに影響する可能性。→ optional 扱いで既存パイプラインは無改修。
- WebGL uniform 更新が `render` 毎に実行されるためパフォーマンス懸念。→ 変更検知（値が変わった時のみ更新）をオプションで実装。

## フォローアップ案
- 将来的に `sceneUniforms` を型安全にするため `SceneRuntimeConfig` ジェネリクスを導入。
- SceneHost 間で共有する UI コンポーネント群を `src/ui/scenes/components/` 配下に整理。
- Hyperbolic シーンの追加（共役操作など）に備えた state machine 設計を検討。
- `useRenderEngineWithCanvas` フックを追加し、Euclidean/Hyperbolic ホストが共通で利用する。
- `controlsFactory`/`embedOverlayFactory` を利用するシーンを順次拡張し、ホスト側の `scene.key` 依存を解消。

## 進捗ログ（2025-10-19）
- [done] タスク1: ドキュメント整備の方針を本計画（v1.1）へ反映し、`sceneUniforms` 導入の目的・ステップを確定。
- [done] タスク2: `sceneUniforms` をレンダーコンテキストへ導入し、`uMaxReflections` をホストから更新・伝搬できるようにした。
- [todo] タスク3: Euclidean シーン全体で共通のプリセット初期化ロジックを導入し、シーン切り替え時でも一貫してテクスチャが表示されるよう調整する。

## フェーズC 設計メモ（2025-10-19）
- **ホスト分割方針**
  - `HyperbolicSceneHost` を新設し、既存 `EuclideanSceneHost` から双曲描画 (`renderHyperbolicScene`) とテクスチャピッカー程度の共通処理のみを抽出。Euclidean 専用ハンドル/円反転ロジックを排除する。
  - `EuclideanSceneHost` は Euclidean 専用のハンドル／半平面ドラッグ／円反転 UI に集中させ、共通フック (`useRenderEngine`, `useSceneTextures`) で WebGL 呼び出しを共有。
- **controlsFactory/overlayFactory**
  - `SceneDefinition` に `controlsFactory?: (ctx: SceneControlsContext) => ReactNode` を追加し、シーン固有 UI を定義側に寄せる。`ctx` には `triangle`, `textureInput`, `setSnapEnabled` など必要ハンドルを提供。
  - 既存の `euclideanHalfPlanes` `embedOverlayFactory` は `controlsFactory` へ移行し、`EuclideanSceneHost` では `scene.controlsFactory?.(context)` を呼び出すだけにする。
- **共通フック**
  - `useRenderEngineWithCanvas(canvasRef, mode)` で `createRenderEngine` 初期化と dispose を管理。
  - `useSceneTextures` で `useTextureInput` と `TEXTURE_SLOTS` 操作をラップ。
- **データフロー**
  - `sceneUniforms`（Phase Bで導入予定）に加え、`SceneRuntimeState` をジェネリクスで扱えるよう型設計。Hyperbolic/Euclidean で個別 state を扱い、ホスト→レンダラー間の契約を明示。
- **移行ステップ**
  1. `useRenderEngineWithCanvas` / `useSceneTextures` を追加し、`EuclideanSceneHost` の既存コードをフック利用に置き換える。
  2. `SceneDefinition` に `controlsFactory` を追加し、`euclideanMultiPlane` と `hyperbolic-tiling-333` を先行移行。
  3. `HyperbolicSceneHost` を実装し、`App.tsx` で geometry ごとにホストを切り替える。
  4. 既存テスト（`app.embed.test.tsx` など）を更新し、`pnpm typecheck` / `pnpm test` を実行。
