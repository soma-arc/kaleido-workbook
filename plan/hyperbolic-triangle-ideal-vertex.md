# Hyperbolic Triangle r = ∞ 対応計画

## 現状
- `buildHyperbolicTriangle(p,q,r)` は `gamma = π / r` を前提に `sidesFromAnglesHyperbolic` で辺長を算出している。
- `r = ∞`（理想頂点）では `gamma → 0` となり、`sin(gamma)` が 0 になるため cosh 計算でゼロ割が発生し NaN になる（`src/geom/triangle/hyperbolicTriangle.ts:24-47`）。
- 頂点配置・測地線生成ロジックも有限角ベースの式に依存し、理想頂点を円板境界上へ置く処理がない。

## 対応方針
1. **API 拡張**: `buildHyperbolicTriangle` にオプション引数 `opts?: { allowIdeal?: boolean }` を追加。`r = Infinity` を受け取ったら `opts.allowIdeal` が true の時のみ処理を進め、それ以外は従来どおりエラー。
2. **角度・辺長の極限処理**:
   - `r = Infinity` の場合、`gamma = 0` として `sidesFromAnglesHyperbolic` を通さず、ロピタル展開で導いた別計算（例: `coshC = (1 + cosα cosβ)/(sinα sinβ)` の極限）を実装する。
   - 実装は `sidesFromAnglesHyperbolic` に `ideal=false` フラグを渡す、または `computeIdealSideLengths(alpha,beta)` など専用関数を追加。
3. **頂点配置の調整**:
   - 現在の `placeVerticesOnDisk` は3頂点とも盤内を前提にしている。理想頂点を扱うには境界上への配置（|z|=1）を許可し、残り2頂点を内部に置く正規化を設計する。
   - 例: 頂点Cを円周上 (`|C|=1`) に置き、他2頂点を既存の式で算出した後に一貫性を保つよう変換。
4. **測地線生成の拡張**:
   - `geodesicThroughPoints` は今も円周上の点を扱えるが、数値誤差で `disc` や `radiusSq` が負になる恐れがあるため、理想頂点ケースでの安定化を追加。
   - 直径（ライン）になる場合の向き決定ロジックも極限で破綻しないよう `DIAMETER_EPS` を見直す。
5. **検証と API 対応**:
   - `(p,q,∞)` パターンで単体テストを追加し、測地線の種類・頂点座標が有限値になることを確認。
   - UI 側（例えば `useTriangleParams`）で `r = Infinity` を選択できるようにし、`allowIdeal` を true で呼び出す経路を追加。

## 成功条件
- `buildHyperbolicTriangle(p,q,Infinity, { allowIdeal: true })` が例外なく `HyperbolicTrianglePrimitives` を返す。
- 頂点の少なくとも1つが円板境界上に配置され、他2点が盤内に収まる。
- `(p,q,r)` の従来ケースは挙動変化なし。
- 新規テストが追加され、理想頂点を含むタイル描画がエラーなく表示される。

## UI スコープ
- Hyperbolic 333 シーンの overlay UI に理想頂点切替の仮ボタンを追加する。
- ボタン押下で `r = Infinity` を選択し `buildHyperbolicTriangle(..., { allowIdeal: true })` で再構築する。
- 再度ボタンを押した場合は通常モードへ戻すトグル挙動を想定。
