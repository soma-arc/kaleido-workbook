# spherical tiling reflection plan

## ゴール
- 球面シーン用フラグメントシェーダに三鏡反射ロジックを導入し、単一三角形から球面タイル張りを生成できる状態にする。
- WebGL レンダラ側で必要なユニフォーム（平面法線・最大反射回数・配色等）を供給し、UI 設定と連動可能な土台を整える。

## 実装ステップ
1. **要件洗い出し**
   - 既存反射シェーダ（hyperbolic/euclidean 系）のループ・パレット構造を再確認。
   - 球面三角形辺→大円平面のベクトル表現と反射式を整理。
2. **CPU 側拡張**
   - `SphericalRenderSettings` に反射最大回数・配色を追加。
   - `packSphericalTriangleVertices` とは別に、各辺の法線ベクトル配列を生成するヘルパーを用意。
   - レンダラ内で新ユニフォームロケーション取得と値送信を実装。
3. **シェーダ改修**
   - 平面法線配列・最大反射回数を受け取る uniform を追加。
   - `renderSample` 内で「inside check→反射ループ→色決定」を実装。球面反射では `normalize` を適宜挟む。
   - 反射回数ベースのパレット/グラデーション、境界フェザー処理を追加してタイルの視認性を確保。
4. **UI / プリセット**
   - `SphericalSceneState` / `trianglePresets` / `SphericalSceneHost` に新設定を通す。
   - デフォルトシーンに実装確認用パラメータを設定。
5. **検証**
   - Vitest（関連ユーティリティ向け）追加。
   - Storybook or 実機で球面シーンがタイル張りになっているか確認し、スクリーンショットを PR 用に保存。

## リスク・留意点
- 反射ループ無限化防止：`uMaxReflections` で打ち切り、ヒット限界時は視覚的に区別。
- 浮動小数誤差対策：平面法線・反射後ベクトルを毎回正規化し、許容閾値を設ける。
- SSAO/色補正との干渉：既存 γ 補正・アンチエイリアスと整合性を保つ。

## 次のアクション
1. 設定スキーマとユーティリティ関数の追加実装。
2. フラグメントシェーダへの反射ロジック組み込み。
3. UI・プリセット更新後に動作確認とテスト整備。

## 調査メモ（Step 1）
- **既存反射シェーダの構造**  
  - `src/render/webgl/shaders/hyperbolicTripleReflection.frag` では `uGeodesicsA[]`（円 or 直線の境界）と `uMaxReflections` を uniform で受け、`tracePoint` を各境界で反射しながら fundamental domain へ写像する。反射回数に応じて `palette()` で色を決定し、テクスチャ適用・フェザー処理を実施する一般パターンを確認。  
  - `euclideanReflection.frag` / `facingMirror.frag` も同様に `reflectPoint` を繰り返す構成で、AA オフセットや γ 補正の扱いは球面シェーダと互換。
- **球面三角形→平面表現**  
  - 頂点 `v_i` は単位球上なので、各辺の大円は原点を通る平面 `n = normalize(cross(v_i, v_j))` で表せる。点 `p` が平面の表側にあるかは `dot(n, p)` の符号で判定可能。  
  - 反射式は `p' = normalize(p - 2.0 * dot(n, p) * n)`（反射後も単位球へ正規化）。数値誤差対策として `abs(dot) < 1e-6` ならスキップし、`normalize` 後に `clamp` する必要がある。  
  - fundamental domain 判定は `all(dot(n_k, p) >= 0)`（法線の向きは三角形の内側を向くよう統一）で実装できる。
- **必要な追加 uniform**  
  - `uTrianglePlanes[3]`（vec3 法線）、`uMaxReflections`（int）、`uTileBaseColor`, `uTileAccentColor`, `uReflectionPalettePhase` など色設定。  
  - 既存の `uSphereBaseColor`, `uTriangleColor` を `uTileColors` にリネーム or 追加して反射結果の塗り分けに利用。  
  - ヒット判定で使う `uBoundaryFeather`（線幅）もオプションで検討。
- **ループ設計メモ**  
  - 1 サンプルあたり `MAX_REFLECTION_STEPS`（8〜32 程度）で打ち切り、`renderSample` 内で `inside` 判定→必要なら `reflect`。  
  - ループ後に `reflections` や `insideFundamental` をもとに base color / accent /背景をブレンド、最後に既存のガンマ補正を適用する。
