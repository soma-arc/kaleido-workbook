# Refactor Backlog（2025-10-19 時点）

## 1. 完了済みハイライト
- Hyperbolic シーン再構成: `hyperbolic-tiling-333` のコロケーション、`HyperbolicSceneHost` 実装、`sceneUniforms` 導入とテスト整備は完了。
- Euclidean シーンで `controlsFactory` / `embedOverlayFactory` を導入し、主要シーンは新テンプレートへ移行済み。
- テクスチャプリセットの自動適用を共通化し、`TextureSlotState.origin` で自動 / 手動を判別可能にした。

## 2. EuclideanSceneHost の現状整理
- 主な責務（現行 1300 行超）
  | 区分 | 内容 | 代表コード領域 |
  |------|------|----------------|
  | レンダー初期化 / rAF | `useRenderEngineWithCanvas` 呼び出し、`renderEuclideanScene`/`renderHyperbolicScene`、カメラデバッグの rAF 管理 | 230〜340, 560〜1100 |
  | 半平面 & ハンドル制御 | 半平面生成・正規化、ドラッグ更新、control points 生成 | 360〜960 |
  | Circle Inversion UI | 矩形ヒットテスト、表示トグル、UV 更新 | 120〜360, 640〜940 |
  | テクスチャ / プリセット | `useTextureInput` ラップ、自動プリセット適用、動的テクスチャ監視 | 240〜320 |
  | エクスポート | `ImageExportControls`、crop & exportPNG | 980〜1150 |
  | モード/プリセット UI | `ModeControls`、Triangle presets、Snap/Depth/TriangleForm | 1080〜1300 |
  | Embed Overlay | Embed 用 UI スロット（handles / circle inversion など） | 1300〜1400 |

## 3. 優先度の高い未完タスク
1. **ホストのスリム化（Phase C）**
   - 例: `useEuclideanRenderer`、`useHalfPlaneControls`、`useCircleInversionState` などフック分割でロジックを外出しし、ホスト本体を 300〜400 行程度へ縮減する。
   - JSX ブロックは `EuclideanBaseControls`, `TriangleControls`, `CircleInversionControls` 等としてコンポーネント化する。

2. **Storybook 自動登録（Phase C）**
   - `src/scenes/**/stories/` を自動走査して登録する仕組みを実装し、シーン追加時の手作業を削減する。

3. **SceneUniforms のジェネリクス対応（Phase D 継続）**
   - `SceneDefinition` → `RenderEngine` → `webglRenderer` → `pipelineRegistry` に型パラメータを導入し、nullable uniform を維持しつつ既知フィールドに型補完を効かせる。

4. **テクスチャ共通ヘルパー**
   - 自動プリセット適用のロジックを `useTextureInput` もしくは専用ユーティリティに移動し、SceneHost からは 1 行で利用できるようにする。

5. **共有 UI の整理（Phase B 残タスク）**
   - `PresetSelector`, `TexturePicker`, `ImageExportControls` など共通コンポーネントの再配置と API 整理。

## 4. 推奨アクション
- 上記未完タスクを Issue 化し、優先度に応じて Phase C → Phase D の計画を立てる。
- 最初のステップとして `useEuclideanRenderer` フックを作成し、レンダーライフサイクルとエクスポート処理をホストから切り離す。
- Storybook 自動登録はビルド設定への影響が大きいため、専用ブランチで実験しつつ `stories/` の命名規則を整備する。
