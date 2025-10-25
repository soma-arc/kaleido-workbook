# Continuous (p,q,r) Triangle Builder: Euclidean (=1) → Hyperbolic (<1) 実装方針

本書は、現行の「双曲三角形ビルダ」を**ユークリッド境界（1/p+1/q+1/r=1）から双曲領域（<1）へ連続遷移**できるように拡張するための実装方針です。球面（>1）は扱いません。  
目的は、**p,q 固定で r を連続に動かしたときに、図形・座標・境界（鏡）が連続に変化**することです。

---

## 0. 要約

- 角度 \(\alpha=\pi/p, \beta=\pi/q, \gamma=\pi/r\)。角和 \(S=\alpha+\beta+\gamma\)。  
- 判定：  
  - \(S = \pi\) → **Euclidean（ユークリッド）**  
  - \(S < \pi\) → **Hyperbolic（双曲, κ=-1）**  
- 連続性の鍵：**ユークリッドでのスケール規約を双曲極限と一致**させる。  
- 数式方針：角（\(\alpha,\beta,\gamma\)）から**閉形式**で辺（\(a,b,c\)）を得る。  
  - 双曲：角版余弦定理で \(\cosh a,\cosh b,\cosh c\)  
  - ユークリッド：相似クラスのためスケール規約で \(a,b,c\) を確定（双曲極限と整合）  
- 幾何配置：共通の**標準配置**を採用（例：辺 c を x 軸上、重心を原点近傍など）  
- 表現：**測地線の抽象**を「直線（Euclid）」と「円板境界に直交する円弧（Hyperbolic）」で切り替え。  
- 数値法：原則**閉形式**。根探し（`solveThirdMirror`）は不要。既存コードは内部実装を差し替え。

---

## 1. スコープと前提

- 対象モデル  
  - ユークリッド平面（κ=0）  
  - 双曲平面（κ=-1; ポアンカレ円板を描画モデルに採用）  
- 非対象：球面（κ=+1）  
- 目的  
  - \(p,q\) 固定、\(r\) を連続変化させても幾何が**座標レベルで連続**  
  - \((p,q,r)\) の有効範囲（双曲条件）外でも、**ユークリッド境界まで**は退化せずに到達  
- 既存依存  
  - `GEODESIC_KIND` / 円板モデルの描画  
  - `SUM_TOL`, `Vec2`, 幾何補助関数群（直交円の構成等）

---

## 2. 数学仕様

### 2.1 角の定義
\[
\alpha=\frac{\pi}{p},\quad \beta=\frac{\pi}{q},\quad \gamma=\frac{\pi}{r},\quad
S=\alpha+\beta+\gamma
\]

### 2.2 幾何レジーム
- **Euclidean**: \(S=\pi\)（許容誤差 `SUM_TOL`）  
- **Hyperbolic**: \(S<\pi\)

### 2.3 角→辺の閉形式（第一原理）
- **Hyperbolic（κ=-1, 角版余弦定理）**  
  \[
  \cosh a = \frac{\cos\alpha+\cos\beta\cos\gamma}{\sin\beta\sin\gamma},\quad
  \cosh b = \frac{\cos\beta+\cos\gamma\cos\alpha}{\sin\gamma\sin\alpha},\quad
  \cosh c = \frac{\cos\gamma+\cos\alpha\cos\beta}{\sin\alpha\sin\beta}.
  \]
  数値計算は \(\cosh^{-1}(x)=\log(x+\sqrt{x^2-1})\) を用いる。丸めで \(x<1\) に落ちた場合は `x = max(1, x)` でクリップ。

- **Euclidean（κ=0, 相似・スケール自由）**  
  - 相似比が自由。**連続性のため**、双曲極限と一致するスケールを採用。  
  - 実装規約：**外接円半径 \(R=1\)** など「固定規約」を採用してもよいが、  
    **推奨**は「双曲側 \(S\nearrow\pi\) の極限に滑らか接続するスケール」。  
  - 具体的には、双曲辺長 \(a_{\text{hyp}}\) に対し、小曲率近似  
    \[
    \ell_{\text{Euc}} \approx \sqrt{2(\cosh a_{\text{hyp}}-1)}
    \]
    を用いて**連続接続**。境界上では \(a_{\text{hyp}}\to 0\) に応じて \(\ell\to\) 有限値に正規化する。

> 備考：上式は \(\cosh a - 1 \sim \tfrac{a^2}{2}\) のテイラー展開に基づく。数値不安定域では `expm1` 系（`cosh(a)-1` の安定計算）を使う。

---

## 3. 標準配置と測地線表現

### 3.1 共通の配置規約
- 三角形の辺 \(c\) を x 軸上（頂点 \(A=(0,0), B=(L,0)\)）。  
- 頂点 \(C\) は上半平面側（y>0）。  
- **Euclidean**：三角形はユークリッド平面にそのまま配置。  
- **Hyperbolic**：ポアンカレ円板へ**同相**に配置する手順を用意（下記）。

### 3.2 ユークリッド側の構成
- \(a,b,c\) が決まれば、標準配置は幾何 101：  
  \[
  A=(0,0),\quad B=(c,0),\quad
  C=\left( \frac{a^2 - b^2 + c^2}{2c},\ \sqrt{a^2 - x_C^2} \right).
  \]
- 測地線＝**直線**。描画レイヤでは「Line」として保持。

### 3.3 双曲側（ポアンカレ円板）への配置
- 目標：**ユークリッド標準配置と連続**に接続。  
- 手順（推奨アプローチ）  
  1) 双曲三角形の**内部角** \((\alpha,\beta,\gamma)\) は既知。  
  2) まず**モデル非依存**に三辺の双曲長 \((a,b,c)\) を上式で計算。  
  3) 円板モデルでの頂点配置は、例えば**二頂点を直径上に置く**規約で開始：  
     - \(A=( -t, 0),\ B=(+t,0)\)（\(0<t<1\)）  
     - 辺 \(c\) の双曲長が所望 \(c\) になるように \(t\) をニュートン or 逆関数で一度だけ解く  
       （直径上の二点間双曲距離は解析式あり）。  
  4) 角度条件から \(C\) の位置を決定：  
     - \(A,B\) を通る測地線は直径。  
     - \(C\) は、それぞれの頂点での**入射角＝内部角**を満たすように、  
       **交角条件**で残りの測地線（境界直交円）を求め、交点を取る。  
- **測地線表現**：  
  - 直径（中心と方向）、  
  - 境界直交円（中心 \(c=(u,v)\)、半径 \(r\)；条件 \(u^2+v^2 = r^2 + 1\)）。  
- **既存の `solveThirdMirror` は不要**（閉形式＋1 回の単純スカラー根探しで十分）。

> 実装簡略化のため、最初は「二頂点を直径に置き、三本目の測地線を交角で解く」パターンに限定して良い。後に一般化（任意配置→等角変換）を入れてもよい。

---

## 4. API 設計

```ts
export type GeometryKind = "euclidean" | "hyperbolic";

export interface TrianglePrimitives {
  kind: GeometryKind;
  vertices: Vec2[];        // 描画座標（Euc: 平面, Hyp: 円板）
  angles: [number, number, number]; // [α, β, γ]
  edges: Geodesic[];       // 直線 or 直交円（方向付き）
  meta: {
    sides: [number, number, number]; // 幾何長（Euc: ユークリッド長, Hyp: 双曲長）
    sumAngles: number;
    regime: "euclidean" | "hyperbolic";
  };
}

export function buildTriangleContinuous(
  p: number, q: number, r: number,
  opts?: {
    // 連続遷移の調整
    sumTol?: number;        // 角和判定トレランス
    place?: "standard";     // 将来用に拡張可能
    euclidScale?: "limit";  // "limit"=双曲極限整合, "circumradius1" 等を将来許容
  }
): TrianglePrimitives;
```

---

## 5. 実装ステップ（Codex 指示用・詳細）

1) **基礎ユーティリティ**
   - `anglesFromPQR(p,q,r): [α,β,γ]`
   - `regimeFromAngles(α,β,γ,sumTol): "euclidean"|"hyperbolic"`

2) **角→辺（閉形式）**
   - `sidesFromAnglesHyperbolic(α,β,γ): {a,b,c}`
     - 上記の \(\cosh\) 式。`safeAcosh(x)` 実装（丸めクリップ）。
   - `sidesFromAnglesEuclideanFromHyperbolicLimit(α,β,γ): {a,b,c}`
     - 連続接続規約（推奨）  
       1. 双曲側で \(\cosh a,\cosh b,\cosh c\) を評価  
       2. \(\ell = sqrt(2*(cosh(a)-1))\) を各辺に適用  
       3. 比例正規化（例えば \(c=1\) に揃える 等）  
     - **備考**：境界厳密 \(S=\pi\) で双曲式が不安定なら、ユークリッドの正弦定理等へ切替。

3) **ユークリッド配置**
   - `placeEuclidean(a,b,c): {A,B,C}`（標準配置）

4) **双曲円板配置**
   - `hypChordLengthFromT(t): number` / `tFromHypLength(c): number`（直径上 2 点の双曲距離の逆写像）  
     - 初期値：`t = tanh(c/4)` 近似など。1 回ニュートンで十分。
   - `placeHyperbolic(a,b,c): {A,B,C}`
     - \(A=(-t,0), B=(+t,0)\) を直径上に置く  
     - 角条件から \(C\) の位置を決定：  
       - 頂点 \(A\) での内部角が \(\alpha\)、頂点 \(B\) で \(\beta\) になるように、  
         交角が指定値となる**直交円**を構成し、交点を \(C\) とする。  
       - 具体：  
         - 「直径と交わる直交円の中心・半径」を**交角＝所与**で解く（解析式あり）。  
         - 2 円の交点から y>0 を選択。
   - 構成後に**三辺の測地線**（直径 or 直交円）を `Geodesic` に落とす。

5) **Geodesic 抽象**
   - `type Geodesic = { kind: "line" | "orthocircle", ... }`
   - 共通 API：交点計算、距離取得（必要なら）、描画用パラメータの導出。

6) **ビルダ本体**
   - `buildTriangleContinuous(p,q,r,opts)`  
     1. `anglesFromPQR` → `regimeFromAngles`  
     2. `regime` により `sides...` を分岐  
     3. `placeEuclidean` / `placeHyperbolic`  
     4. `Geodesic[]` を構築  
     5. `TrianglePrimitives` を返す

7) **既存コードの置き換え**
   - `buildHyperbolicTriangle` は内部で `buildTriangleContinuous` を呼ぶ薄いラッパに格下げ（後方互換）。  
   - `solveThirdMirror` / `circleFromParameter` 依存を解消。

---

## 6. 数値安定性とトレランス

- 角和判定 `SUM_TOL`：例 `1e-10`〜`1e-8`  
- \(\cosh^{-1}\) 入力 `x<1` クリップ： `x = Math.max(1, x)`  
- 小角域：`cosh(a)-1` 計算は `expm1` を活用（`cosh(a) = (e^a+e^{-a})/2`→オーバーフロー回避）  
- 直交円の中心計算で判別式が負に落ちたら、`max(0, disc)` でクリップ  
- 上半平面選択（y>0）などの**枝選択の一意化**で連続性確保

---

## 7. テスト計画

### 7.1 単体
- 角→辺（双曲）  
  - 対称例：(p,q,r)=(3,3,7)… 既知性質で相互一貫性（余弦定理の逆検査）  
- ユークリッド境界近傍  
  - (p,q,r)=(3,3,6.000001), (3,3,6), (3,3,5.999999) をスイープ  
  - 連続性：頂点座標・辺表現が**不連続に飛ばない**こと  
- 退化検査  
  - \(r\to\infty\)（\(\gamma\to 0\)）：三角形が極端に細長くなっても安定

### 7.2 可視
- p=3, q=3 固定、r を 5.7→6.3 まで 0.01 刻み、座標時間系列で**滑らか**に変化  
- 鏡境界（Geodesic 可視化）が Euclid⇄Hyperbolic で破綻しない

---

## 8. 実装スケルトン（TypeScript）

```ts
export function buildTriangleContinuous(
  p: number, q: number, r: number,
  opts?: { sumTol?: number; place?: "standard"; euclidScale?: "limit"; }
): TrianglePrimitives {
  const sumTol = opts?.sumTol ?? 1e-9;

  // 1) Angles & regime
  const α = Math.PI / p, β = Math.PI / q, γ = Math.PI / r;
  const S = α + β + γ;
  const regime = (Math.abs(S - Math.PI) <= sumTol) ? "euclidean"
                : (S < Math.PI) ? "hyperbolic"
                : (() => { throw new Error("S>π (spherical) not supported"); })();

  // 2) Sides
  let a: number, b: number, c: number;
  if (regime === "hyperbolic") {
    ({a,b,c} = sidesFromAnglesHyperbolic(α,β,γ));
  } else {
    ({a,b,c} = sidesFromAnglesEuclideanFromHyperbolicLimit(α,β,γ));
  }

  // 3) Placement
  let vertices: Vec2[];
  let edges: Geodesic[];
  if (regime === "euclidean") {
    const {A,B,C} = placeEuclidean(a,b,c);  // standard planar placement
    vertices = [A,B,C];
    edges = geodesicsFromEuclideanTriangle(A,B,C); // 3 lines
  } else {
    const {A,B,C} = placeHyperbolic(a,b,c); // Poincaré disk placement
    vertices = [A,B,C];
    edges = geodesicsFromHyperbolicTriangle(A,B,C); // diameters / orthocircles
  }

  return {
    kind: regime,
    vertices,
    edges,
    angles: [α,β,γ],
    meta: { sides: [a,b,c], sumAngles: S, regime }
  };
}
```

---

## 9. 既存コードへの変更点（最小差分）

- `buildHyperbolicTriangle(...)` → `buildTriangleContinuous(...)` 呼び出しに置換  
- `solveThirdMirror` / `circleFromParameter` を廃止  
  - 双曲三辺長から直接「二直径＋一直交円」の組合せを解くルーチンへ移行  
- `Geodesic` 抽象を導入（`line` / `orthocircle`）  
- レンダラは `Geodesic` に従って線分・円弧を描画（既存の描画器具を流用可能）

---

## 10. 今後の拡張余地（任意）

- 配置の多様化（等角変換で任意回転・平行移動・Möbius 正規化）  
- 速度最適化（事前計算テーブル、近傍の r 更新に対する増分更新）  
- タイリング（反射群生成）との結合：鏡から群作用を構成

---

## 付録 A：実装時の要注意（コーディング規約向け）

- **浮動小数比較は必ずトレランス付き**  
- **分岐点周辺はリミット一致の単調テスト**（片側差分で確認）  
- **API は純粋関数**（入力→出力。外部状態に依存しない）  
- **例外メッセージは条件と数値を含める**（デバッグ容易化）

---

## 付録 B：Codex へのプロンプト雛形

> 次の要件で TypeScript 実装を行ってください。  
> 1) `buildTriangleContinuous(p,q,r,opts)` を新規作成。  
> 2) 角 \(\alpha,\beta,\gamma\) を計算し、角和 S で Euclidean/Hyperbolic を判定（Tol=1e-9）。  
> 3) Hyperbolic では角版余弦定理で \(\cosh a,\cosh b,\cosh c\)→\(a,b,c\)。`safeAcosh` 実装。  
> 4) Euclidean では双曲極限整合のスケールで \(a,b,c\) を得る。  
> 5) Euclidean 標準配置 `placeEuclidean`、Hyperbolic 円板配置 `placeHyperbolic` を実装。  
> 6) 測地線抽象 `Geodesic`（line/orthocircle）を定義し、三辺を構築。  
> 7) 連続性テスト：p=3,q=3 固定で r を 5.7〜6.3 スイープし、頂点・辺が不連続に跳ばないことを確認するユニットテストを追加。  
> 8) 既存の `buildHyperbolicTriangle` は内部で `buildTriangleContinuous` を呼ぶラッパに置換。`solveThirdMirror` の使用箇所を削除。  
> 9) すべての新規関数に JSDoc を付与し、境界条件の動作を記述。

---

以上です。コード生成に移す段階で、この方針をそのまま貼り付けてください。
