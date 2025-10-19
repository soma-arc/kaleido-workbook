# Oriented Geodesic 仕様案（ドラフト v2）

## 背景
- 現状のハイパーボリック三角形は `Geodesic`（円/直線）と `HalfPlane` を別々に扱っており、境界向きの齟齬が生じやすい。
- HalfPlane の法線を一律「外向き（外部が正）」と定義し直したうえで、円も半平面も同じ signed distance ルールで扱いたい。
- シェーダ／UI で境界と内部領域を一貫して扱い、向きに由来するバグを防ぎたい。

## 目標
- 円と直線（半平面）を「外向き法線」を持つ単一の型で表現し、距離計算や閾値処理を統一する。
- 内部判定は `signedDistance <= 0`（＝境界内）として扱い、外部は正値となるように揃える。

## 提案概要
- `OrientedGeodesic` を導入し、以下の 2 形を統合する:
  ```ts
  type OrientedGeodesic =
    | { kind: "circle"; center: Vec2; radius: number; orientation: 1 | -1 } // orientation=1: 外向き法線（外側が正）
    | { kind: "line"; anchor: Vec2; normal: Vec2 }; // normal は常に外向き（外部が正）
  ```
- 直線（旧 half-plane）は `anchor + normal` で定義し、`normal` は外向きを向く単位ベクトルに正規化する。
- 円は `orientation` で外向き法線の符号を調整し、`signedDistance(point) = orientation * (|point-center| - radius)` を利用する。これにより外側が正、内側が負となる。

## HalfPlane 再定義
- `HalfPlane.normal` は「外側」を指すように統一する（従来通り）。
- `evaluateHalfPlane` は `dot(normal, point - anchor)` を返し、外側で正、内側で負となる。
- ミラー内部を扱うロジックでは `signedDistance <= 0` を内側判定に利用する。

## API 更新方針
1. `HalfPlane` コメントを「normal は外向き」と明記し、テストを更新する。
2. `OrientedGeodesic` 型を追加し、`signedDistance`・`surfaceNormal` などのアクセサを提供する（外向き法線が基本）。
3. `buildHyperbolicTriangle` などの境界生成関数を `OrientedGeodesic` を返すようリファクタ。
4. `buildTiling` / `facesToEdgeGeodesics` / WebGL uniform packing を `OrientedGeodesic` ベースに再実装（外向き法線・外側正の signed distance を活用）。
5. シェーダ（`hyperbolicTripleReflection.frag` 等）で `signedDistance` を共通処理へ集約し、円/直線を同じ分岐で扱う。
6. テスト群を更新し、外向き法線と内側判定（<=0）を検証する。

## 残タスク
- OrientedGeodesic 型・ユーティリティ関数の実装。
- HalfPlane 再定義による既存コードへの影響調査と調整。
- WebGL パイプラインとシェーダの距離計算ロジック統合。
- README や関連ドキュメントの更新。
