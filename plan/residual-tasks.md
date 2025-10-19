# 残タスク一覧（2025-10-19 時点）

## 1. `sceneUniforms` の型安全化（継続）
- `SceneDefinition` → `RenderEngine` → `webglRenderer` → `pipelineRegistry` の各層にジェネリクスを導入し、シーン固有の uniform 仕様を型で表現する。
- Nullable uniform を許容しつつ、`HyperbolicTripleReflectionUniforms` など既知のプロパティには補完が効くようにする。
- 実装後は `pnpm typecheck` / `pnpm test` を実行し、関連ドキュメント（`plan/hyperbolic-scene-refactor.md` など）を更新する。

## 2. テクスチャ自動適用の挙動調整（フォローアップ）
- [done] `TextureSlotState.origin` を導入し、自動適用 (`"auto"`) と手動操作 (`"manual"`) をコード上で判別可能にした。
- [todo] 自動適用の再実行条件（ユーザーが明示的に解除した場合など）を整理し、必要なら UI から無効化できるようにする。

## 3. ドキュメント整備
- `README.md` または Docs に、今回導入した「シーンの `defaultTexturePresetId`」と「nullable uniform の扱い」を追記する。
- `plan/hyperbolic-scene-refactor.md` の今後タスク（Phase C/D）と整合が取れているかを再確認し、最新状態へアップデートする。

## 4. 構成全体の棚卸し
- `EuclideanSceneHost` の共通化後の責務をレビューし、不要になったヘルパーやコメント、TODO を整理する。
- Phase B/C の未対応項目（例: 他シーンの `controlsFactory` 移行や Storybook 登録）について実施可否を判定し、別イシュー化する。
