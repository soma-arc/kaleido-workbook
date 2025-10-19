# Euclidean Reflection テクスチャ矩形対応計画（2025-10-19）

## 目的
- `euclideanReflection.frag` におけるテクスチャ合成処理を画面全体から「任意矩形への限定描画」に変更し、`euclideanCircleInversion` と同様の矩形ベースの制御に揃える。
- テクスチャ矩形の描画有無を制御するためのユニフォームを導入し、シーン設定から ON/OFF できるようにする。

## 背景
- 現状の `euclideanHalfPlanePipeline` では背景全体にテクスチャを合成するため、半平面シーンでテクスチャを限定的に描画する拡張が困難。
- `euclideanCircleInversionPipeline` では矩形・テクスチャ設定が充実しているため、同様の仕組みを `euclideanReflection` 系にも適用することでシーン間の整合性を高めたい。

## 方針
1. **シェーダー改修**  
   - `euclideanReflection.frag` に矩形情報（中心座標、半径、回転）を受け取る uniform を追加。  
   - テクスチャ描画を矩形領域内のみに限定するロジックへ変更し、矩形外は現行の反射塗りを維持。  
   - `uTextureEnabled` のようなユニフォームを追加し、矩形描画そのものを制御。
2. **パイプライン改修**  
   - `euclideanHalfPlanePipeline.ts` で新 uniform を解決し、GPU へ送る。既存のテクスチャ状態管理（`textureManager`）と整合を取る。  
   - 新しい矩形設定をシーンストア（`SceneDefinition`） or 状態から取得し登録する仕組みを整備。
3. **シーン定義/設定拡張**  
   - 半平面系シーン（multi/single/hinge/facing mirror など）に矩形設定を追加（省略時のデフォルト、表示トグル）。  
   - `SceneContextExtras` と overlay で矩形表示フラグを切り替えられる UI を検討。
4. **テスト整備**  
   - シェーダー計算に関する単体テスト（uniform 設定、矩形外での挙動）を追加。  
   - パイプラインレベルでも矩形 ON/OFF に応じた uniform 値が設定されるか検証。  
   - UI テストで矩形描画トグルの存在と連携を確認。

## タスク分解
1. **仕様整理**  
   - 矩形指定の座標系・パラメータ決定（中心・半径・回転など）。`euclideanCircleInversion` の `rectangle` 設定を参考に定義。
2. **uniform 定義・シェーダー更新**  
   - `euclideanReflection.frag` に矩形情報と `uTextureEnabled` を追加。  
   - GLSL 内で矩形内判定を行い、内側のみテクスチャサンプルを描画するロジックを実装。
3. **パイプライン更新** (`euclideanHalfPlanePipeline.ts`)  
   - 新 uniform ロケーション取得と値設定を追加。  
   - レンダリング時にシーンから矩形情報を取得・適用できるよう構造体を定義。
4. **SceneDefinition/State 更新**  
   - 半平面系シーンに矩形設定（デフォルト位置/サイズ/回転/有効フラグ）を追加。  
   - UI/overlay でトグルスイッチを追加し、`context` 経由で pipeline に反映。
5. **テスト強化**  
   - パイプラインユニットテストで uniform 設定と有効/無効切り替えを検証。  
   - UI テストで矩形設定が適用されるかを確認。
6. **ドキュメント更新**  
   - シーン仕様書・プランに新矩形設定やトグル操作方法を追記。

## 懸念点と対策
- **パラメータの追加管理**：複数シーンで矩形設定を扱うため、共通型を用意し、SceneDefinition へ統一的に追加する。  
- **既存描画との互換性**：矩形 OFF の場合は現行挙動を維持するため、デフォルト値と fallback を設計。  
- **テクスチャマネージャーとの接続**：現在は全画面合成前提なので、矩形内でのサンプリング位置計算を安全に行うため、テクスチャ座標設定を`circleInversion`と同様の方式に合わせる必要がある。

## 完了条件（DoD）
- `euclideanReflection.frag` が矩形境界内のみテクスチャを合成し、矩形外は従来処理を維持する。  
- 矩形描画の ON/OFF をユニフォーム経由で切り替えられる。  
- 半平面関連シーンから矩形パラメータを設定でき、UI/Overlay でトグルが可能。  
- lint・typecheck・テストが Green。
