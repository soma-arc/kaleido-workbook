# Circle inversion シーン制御点描画修正計画

## 背景
- Circle inversion シーンは専用 WebGL パイプライン `src/render/webgl/pipelines/euclideanCircleInversionPipeline.ts` を利用しており、直線制御点（`circle-line-start`/`circle-line-end`）を WebGL で描画する設計。
- `EuclideanSceneHost` からは毎フレーム `halfPlaneControlPoints` が `renderEngine.render(...)` に渡されるが、同パイプラインは制御点 uniform を受け取らず描画処理が存在しない。
- その結果、ハイブリッドモード（Canvas+WebGL）で WebGL が有効な場合、制御点が一切画面に現れない。

## 対応方針
1. **共通実装の確認**: 既存の `euclideanHalfPlanePipeline` が採用している `convertHalfPlaneControlPointsToRenderPoints` → `buildControlPointUniforms` の流れを再利用し、同等の uniform セットを Circle inversion パイプラインにも定義する。
2. **WebGL へのデータ受け渡し**: `EuclideanCircleInversionPipeline.render` に `halfPlaneControlPoints` を引数として受け取らせ、変換結果を uniform に詰めてシェーダに渡す。必要に応じて control point 描画用の fragment shader 定義を追加。
3. **描画ロジックの実装**:
   - 既存の geodesic ベクトル一枚板描画に続いて、制御点用ジオメトリ（点／矩形）を描画するパスを設計。
   - もしくは共通頂点シェーダを流用し、制御点をインスタンス描画する。
4. **反転像の描画要件を追加**:
   - 各制御点の円反転結果（固定円に対する像）を計算し、制御点と同じスタイル体系で WebGL 上に描画する。
   - 直線を構成する2つの制御点については、それぞれ別色（例: start = オレンジ、end = シアン）で描画し、反転像も対応する色で区別する。
   - 反転計算で数値的不安定が発生した場合のフォールバック（例: 反転不可時は元の色のまま非表示 or 代替マーカー）を検討。
   - プライマリ矩形／セカンダリ矩形については、反転前後で対応する色が一致するよう uniform 設定を整理し、視覚的なペアを容易に判断できるようにする。
   - 固定円の中心（0,0）にも制御点と同サイズの円マーカーを描画し、視覚的な参照点として機能させる。
5. **UI との整合性検証**: Circle inversion シーンで `showHandles` を有効化し、制御点およびその反転像が表示・ドラッグに追随することを手動確認。必要に応じて Vitest で `convertHalfPlaneControlPointsToRenderPoints` の入出力が崩れていないかを再利用テスト。
6. **リファクタ検討 (任意)**: 共通化できる制御点レンダリング補助（uniform 構造体など）を pipeline 間で再利用し、重複を抑制。

## 成功条件
- Circle inversion シーンで WebGL ハイブリッド描画時にも制御点が Canvas なしで可視化される。
- `showHandles` の ON/OFF、ドラッグ操作に追随する。
- 既存の他シーン (multi-plane など) で制御点が引き続き描画されることを確認。
