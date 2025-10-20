# Scene パイプライン識別子整備計画（2025-10-19）

## 目的
- 各 `SceneDefinition` から「どの WebGL パイプライン（＝シェーダー群）で描画されるか」を一目で把握できるようにする。
- `registerSceneWebGLPipeline` との不整合を排除し、シーン追加・改修時の検証を容易にする。

## 背景
- 現状、シーンとパイプラインの結び付きは `registerSceneWebGLPipeline(SCENE_IDS.xxx, PIPELINE_ID, factory)` の呼び出しに暗黙的に埋まっており、SceneDefinition からは追跡しづらい。
- Scene 定義からパイプライン/シェーダーを特定するには `render/webgl/pipelines/**` を横断的に検索する必要があり、認知コストが高い。
- コロケーションを行わない方針にシフトしたため、SceneDefinition 側にパイプライン情報を持たせる必要が高まっている。

## 方針
1. `SceneDefinition` に `renderPipelineId`（仮称）を追加し、SceneDefinition だけで使用パイプラインを明示できるようにする。
2. `registerSceneWebGLPipeline` のラッパーまたはユーティリティを導入し、登録時に `SCENE_IDS` → `renderPipelineId` への反映／整合性チェックを行う。
3. 既存シーンの Definition に ID を付与し、パイプライン登録コードとテストで整合を確認する。
4. 共有パイプライン（ジオメトリ単位／デフォルト）とシーン専用パイプラインの扱いを明確化する。

## タスク分解
1. **型拡張**
   - `src/ui/scenes/types.ts` の `SceneDefinition` に `renderPipelineId: string` を追加（必須化を想定）。  
   - SceneDefinitionInput にも反映し、既存シーンに適切な ID を設定。
2. **登録ユーティリティの追加**
   - `registerSceneWebGLPipeline` をラップするヘルパーを `render/webgl/pipelineRegistry.ts` もしくは新規モジュールに追加。  
   - 呼び出し時に `SCENE_IDS.xxx` と `pipelineId` を受け取り、内部マップへ記録することで SceneDefinition へ ID を自動設定／検証できるようにする。
3. **SceneDefinition 初期化処理の調整**
   - `sceneDefinitions.tsx` 生成時に、登録済みのパイプライン ID と SceneDefinition の `renderPipelineId` が一致するかチェックし、未設定／不整合ならビルド時エラーを出す。
   - 共有パイプライン（ジオメトリ別／デフォルト）については明示的に ID を設定する戦略を決める（例: `webgl-hyperbolic-geodesic` など）。
4. **既存シーンの設定**
   - 各シーン定義ファイルで `renderPipelineId` を設定。  
     - 例: `euclideanCircleInversionScene` → `EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID`。  
     - 共有パイプラインを利用するシーンは該当 ID を指定。
5. **テスト整備**
   - レジストリと SceneDefinition の整合性を確認するユニットテストを `tests` に追加。  
   - 例: 全 SceneDefinition の `renderPipelineId` に対し、pipelineRegistry 内で登録済みの ID が存在することを検証。
6. **文書化**
   - `plan/overlay-defaults.md` 等の関連ドキュメントや開発ガイドに「SceneDefinition > renderPipelineId を参照する」旨を追記。

## 懸念と対策
- **二重管理リスク**: SceneDefinition と `registerSceneWebGLPipeline` の両方で ID を指定すると不整合が発生しやすい。→ タスク2・3で自動反映や検証を導入し、ビルド時に検出可能にする。
- **共有パイプラインの識別**: ジオメトリ共有の場合でも ID を必須にすると SceneDefinition の記述量が増える。→ 予め共通 ID を用意しておき、共有シーンに設定する運用を確立する。
- **導入コスト**: 既存シーンの全定義に ID を付与する必要がある。→ 先にテーブルを作成して値をまとめ、まとめて反映する手順を整備。

## 完了条件
- すべての `SceneDefinition` に `renderPipelineId` が設定され、導出先（shared or scene-specific pipeline）を追跡できる。
- `registerSceneWebGLPipeline` 経由で SceneDefinition → Pipeline ID の整合性が保証され、ユニットテストで検証される。
- ドキュメント（ガイド／計画書）に新ルールが明記されている。
