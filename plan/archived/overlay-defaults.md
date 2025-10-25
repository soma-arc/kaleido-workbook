# シーン共通オーバーレイ初期表示計画（2025-10-19）

## 目的
- Hyperbolic / Euclidean / Spherical の全シーンで embed モードの操作系オーバーレイを既定表示にする。
- 説明ラベルのみのオーバーレイ定義は削除し、不要な UI を排除する。

## スコープ
- 対象: すべての `SceneHost` (`HyperbolicSceneHost`, `EuclideanSceneHost`, `SphericalSceneHost`)、全 `SceneDefinition`
- 非対象: 現状維持とするレンダリング／ハンドル制御ロジック本体

## 現状
- ホストごとに embed オーバーレイの初期表示制御がバラバラで、初回非表示のものが多数。
- 操作系 UI（ハンドル切替、テクスチャコントロール等）は隠れていると使い勝手が悪い。
- 説明ラベルのみのファクトリは存在価値が低いため削除可能。

## 方針
1. 全シーンの `embedOverlayFactory` を調査し、操作 UI かラベルのみかを分類する。
2. `SceneDefinition` に `embedOverlayDefaultVisible?: boolean`（既定 `true`）を追加。
   - 操作 UI を提供するシーンは既定 `true` で初期表示。
   - ラベルのみのシーンはファクトリ自体を削除する（オーバーレイ非表示）。
3. 各 SceneHost で初期表示 state を `scene.embedOverlayDefaultVisible` に基づいて制御する。
4. ユーザーが閉じた際は `manual` 状態に遷移し、自動再表示を抑止（ホスト共通のフックへ切り出しを検討）。
5. テスト（`tests/unit/ui/scenes/sceneDefinitions.embed.test.tsx` など）で各シーンの初期表示を検証。

## 作業ステップ
1. `SceneDefinition` へ `embedOverlayDefaultVisible?: boolean` を追加し、Hyperbolic/Spherical 含む全シーンに値を設定。
2. ラベルのみのオーバーレイ定義を削除（不要な factory をクリーンアップ）。
3. 各 SceneHost の embed 表示制御を共通フックまたはヘルパーに抽出し、初期 state を統一。
4. ユニットテストと Storybook Play で初期表示状態を確認。
5. README / Docs へ仕様を追記（embed モードでの初期表示、オーバーレイの閉じ方など）。

## メモ
- オーバーレイ開閉状態の永続化（URL パラメータやローカルストレージ）は将来要望として検討リング。
- Operation 手順が複雑化するため、共通フック化（例: `useSceneOverlayVisibility`）も合わせて検討する。
