# Hyperbolic Triangle → Geodesic Circles (Poincaré Disk) — Implementation Guide (for Codex)

目的：与えられた \((p,q,r)\)（双曲条件：\(\frac1p+\frac1q+\frac1r<1\)）から、ポアンカレ円板上における**三辺の測地線**（= 単位円に直交する円弧／直径）を**数値安定・閉形式**で構成する。  
描画側は「円の中心・半径（または直径の向き）」さえ得られればよい前提。**数値根探索は不要**。

---

## 数学的方針（概要）

1. 角 \(\alpha=\pi/p,\ \beta=\pi/q,\ \gamma=\pi/r\) を計算。  
2. 双曲余弦定理（角版）から**三辺の双曲長** \((a,b,c)\) を閉形式で求める：  
   \[
   \cosh a = \frac{\cos\alpha+\cos\beta\cos\gamma}{\sin\beta\sin\gamma},\quad
   \cosh b = \frac{\cos\beta+\cos\gamma\cos\alpha}{\sin\gamma\sin\alpha},\quad
   \cosh c = \frac{\cos\gamma+\cos\alpha\cos\beta}{\sin\alpha\sin\beta}.
   \]
3. **双曲双曲面（双曲放物面）モデル**（Lorentz/ハイパーボロイド）で三頂点 \(A,B,C\) を“**閉形式**”に配置：  
   - モデル：\(H^2=\{(x_0,x_1,x_2): x_0^2-x_1^2-x_2^2=1,\ x_0>0\}\)。  
   - 距離：\(\cosh d(X,Y)=-\langle X,Y\rangle\)（Lorentz 内積 \(\langle X,Y\rangle=x_0x_0'-x_1x_1'-x_2x_2'\)）。  
   - 配置：
     \[
     A=(1,0,0),\quad B=(\cosh c,\ \sinh c,\ 0),
     \]
     \[
     C=(x_0,x_1,x_2),\ \ x_0=\cosh b,\ \ x_1=\frac{\cosh c\cosh b-\cosh a}{\sinh c},\ \ 
     x_2=+\sqrt{x_0^2-x_1^2-1}.
     \]
     ※ \(x_2>0\) を選んで**表裏の一意性**を確保（連続性のため）。
4. **ポアンカレ円板**へ写像（中心 \((0,0)\)、半径 1）：  
   - 射影：\((x_0,x_1,x_2)\mapsto (u,v)=(x_1,x_2)/(x_0+1)\)。  
   - これで頂点座標 \(A',B',C'\in \mathbb{D}=\{u^2+v^2<1\}\) を得る。
5. 任意の 2 点 \(P,Q\in\mathbb{D}\) を通る**測地線**は、単位円に直交する**円**（または直径）。  
   - **直交条件**：円中心 \(c\) と半径 \(r\) は \(|c|^2 = r^2 + 1\)。  
   - さらに \(|P-c|=r,\ |Q-c|=r\)。  
   - よって \(c\) は**線形方程式**で解ける（下に実装式）。線分が原点を通る場合は「直径」。

---

## API 設計（TypeScript）

```ts
export type Vec2 = { x: number; y: number };

export type Geodesic =
  | { kind: "diameter"; dir: Vec2 } // 単位円中心を通る直線（方向ベクトルは正規化不要でも可）
  | { kind: "orthocircle"; c: Vec2; r: number }; // 単位円に直交する円

export interface HyperbolicTriangleDisks {
  vertices: [Vec2, Vec2, Vec2];     // A', B', C' in Poincaré disk
  edges: [Geodesic, Geodesic, Geodesic]; // 対応する 3 測地線
  angles: [number, number, number]; // [α, β, γ]
  sides: [number, number, number];  // [a, b, c] (双曲長)
}

export function computeHyperbolicTriangleDisks(p: number, q: number, r: number): HyperbolicTriangleDisks;
```

---

## 実装詳細

### 1) 角・辺長の計算

```ts
function anglesFromPQR(p: number, q: number, r: number): [number, number, number] {
  if (!(p > 1 && q > 1 && r > 1)) throw new Error("p,q,r must be > 1");
  const α = Math.PI / p, β = Math.PI / q, γ = Math.PI / r;
  if (α + β + γ >= Math.PI) throw new Error("Not hyperbolic: α+β+γ >= π");
  return [α, β, γ];
}

function safeAcosh(x: number): number {
  // 数値誤差で 1 未満に落ちた場合のクリップ
  const xx = Math.max(1, x);
  return Math.log(xx + Math.sqrt(xx * xx - 1));
}

function sidesFromAnglesHyperbolic(α: number, β: number, γ: number): { a: number; b: number; c: number } {
  const Sβγ = Math.sin(β) * Math.sin(γ);
  const Sγα = Math.sin(γ) * Math.sin(α);
  const Sαβ = Math.sin(α) * Math.sin(β);
  const ca = (Math.cos(α) + Math.cos(β) * Math.cos(γ)) / Sβγ;
  const cb = (Math.cos(β) + Math.cos(γ) * Math.cos(α)) / Sγα;
  const cc = (Math.cos(γ) + Math.cos(α) * Math.cos(β)) / Sαβ;
  const a = safeAcosh(ca), b = safeAcosh(cb), c = safeAcosh(cc);
  return { a, b, c };
}
```

### 2) ハイパーボロイド配置 → 円板射影

```ts
function placeOnHyperboloidAndProjectToDisk(a: number, b: number, c: number): [Vec2, Vec2, Vec2] {
  // A=(1,0,0), B=(cosh c, sinh c, 0)
  const ch_c = Math.cosh(c), sh_c = Math.sinh(c);
  const x0 = Math.cosh(b);
  const x1 = (ch_c * x0 - Math.cosh(a)) / sh_c;
  const tmp = x0 * x0 - x1 * x1 - 1;
  const x2 = Math.sqrt(Math.max(0, tmp)); // y>0 側を採用

  // Poincaré disk projection: (x1, x2) / (x0 + 1)
  const A: Vec2 = { x: 0, y: 0 }; // A = (1,0,0) → (0,0)
  const B: Vec2 = { x: sh_c / (ch_c + 1), y: 0 };
  const C: Vec2 = { x: x1 / (x0 + 1), y: x2 / (x0 + 1) };
  return [A, B, C];
}
```

### 3) 2 点を通る「単位円に直交する円」の中心と半径

**条件**：中心 \(c\in\mathbb{R}^2\)、半径 \(r>0\)。  
- 直交：\(|c|^2 = r^2 + 1\)。  
- 円上：\(|P-c|^2 = r^2,\ |Q-c|^2=r^2\)。  
- 差を取ると一次式：\(|P|^2 - 2P\cdot c = |Q|^2 - 2Q\cdot c\)  
  \(\Rightarrow 2(Q-P)\cdot c = |Q|^2 - |P|^2\)。  
**よって**、\(c\) は \((Q-P)\) に直交する法線方向に乗る。さらに直交条件 \(|c|^2 - r^2 = 1\) と合わせて解ける。  
実装は**線形連立を直接解く形**が安定。

実用関数：

```ts
function geodesicThrough(P: Vec2, Q: Vec2): Geodesic {
  // 直径（原点を通る直線）かどうかを先に判定
  // 原点, P, Q が一直線上で、線が原点を通るなら直径
  const cross = P.x * Q.y - P.y * Q.x;
  if (Math.abs(cross) < 1e-14) {
    // 原点と P, Q が同一直線上
    return { kind: "diameter", dir: { x: P.x + Q.x, y: P.y + Q.y } };
  }

  // 一般円：中心 c を解く
  // 式：2(Q-P)·c = |Q|^2 - |P|^2, かつ |c|^2 - r^2 = 1, |P-c|^2 = r^2
  // まず、c は (Q-P) に対してスカラー射影で一意に決まる：
  const qp = { x: Q.x - P.x, y: Q.y - P.y };
  const M = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };

  // 連立：
  // ⎧ (Q-P)·c = (Q-P)·M   （垂直二等分線）
  // ⎨ P·c = (1 + |P|^2)/2 （直交条件と |P-c|^2=r^2 の消去から）
  const A11 = qp.x, A12 = qp.y, B1 = qp.x * M.x + qp.y * M.y;
  const A21 = P.x,  A22 = P.y,  B2 = (1 + P.x*P.x + P.y*P.y) / 2;

  const det = A11 * A22 - A12 * A21;
  let cx: number, cy: number;
  if (Math.abs(det) < 1e-14) {
    // 退化時は Q 側式で代替
    const A21b = Q.x, A22b = Q.y, B2b = (1 + Q.x*Q.x + Q.y*Q.y) / 2;
    const detb = A11 * A22b - A12 * A21b;
    if (Math.abs(detb) < 1e-14) throw new Error("Degenerate geodesic center");
    cx = (B1 * A22b - A12 * B2b) / detb;
    cy = (A11 * B2b - B1 * A21b) / detb;
  } else {
    cx = (B1 * A22 - A12 * B2) / det;
    cy = (A11 * B2 - B1 * A21) / det;
  }
  const c = { x: cx, y: cy };
  const r = Math.sqrt(Math.max(0, c.x*c.x + c.y*c.y - 1));
  return { kind: "orthocircle", c, r };
}
```

### 4) まとめ関数

```ts
export function computeHyperbolicTriangleDisks(p: number, q: number, r: number): HyperbolicTriangleDisks {
  const [α, β, γ] = anglesFromPQR(p, q, r);
  const { a, b, c } = sidesFromAnglesHyperbolic(α, β, γ);
  const [A, B, C] = placeOnHyperboloidAndProjectToDisk(a, b, c);

  // 各辺（対頂点のペアで決定）
  const e_a = geodesicThrough(B, C); // 辺 a（A の対辺）
  const e_b = geodesicThrough(C, A); // 辺 b（B の対辺）
  const e_c = geodesicThrough(A, B); // 辺 c（C の対辺）

  return {
    vertices: [A, B, C],
    edges: [e_a, e_b, e_c],
    angles: [α, β, γ],
    sides: [a, b, c],
  };
}
```

---

## 数値安定性・連続性の注意

- \(S=\alpha+\beta+\gamma\) が \(\pi\) に非常に近いとき（ユークリッド境界近傍）は、\(\sinh c\) 分母や \(\sqrt{\cdot}\) が小さくなる。  
  - `safeAcosh` で \(\cosh\) 入力を `max(1, x)` にクリップ。  
  - \(x_2=\sqrt{\max(0, x_0^2-x_1^2-1)}\) として判別式の負落ちを防止。  
  - 方向一意性（\(x_2>0\)）の固定で**連続なブランチ**を確立。
- `geodesicThrough` の退化（`det≈0`）では、別の連立（Q を使う）に**自動切替**。さらにダメなら例外に。  
- 直径判定は外積 `cross(P,Q)` を用いる。閾値は描画解像度に応じて 1e-12〜1e-8 程度で調整。

---

## 出力の幾何的正当性チェック（簡易ユニット）

1. 各 `orthocircle` で \(|c|^2 - r^2\) が 1（±小トレランス）にあること。  
2. 各辺の 2 頂点が円（または直径）上にあること（距離一致／直線距離の外積 ≈ 0）。  
3. 内角の検証：円板の**等角性**により、頂点での 2 辺の**ユークリッド角**が \(\alpha,\beta,\gamma\) に一致することを確認。

---

## 追加：インターフェース例（描画側）

```ts
function drawGeodesic(ctx: CanvasRenderingContext2D, g: Geodesic) {
  if (g.kind === "diameter") {
    const { x, y } = g.dir;
    // 単位円中心から方向 (x,y) の直線
    // 可視化はキャンバス座標へスケール後、端点は円境界との交点で切る
  } else {
    const { c, r } = g;
    // 中心 c、半径 r の円弧。単位円内の弧のみ描く（境界交点でクリッピング）
  }
}
```

---

## 全体フロー（Codex への依頼テンプレ）

> TypeScript で以下を実装してください：  
> 1) `computeHyperbolicTriangleDisks(p,q,r)`（本書の API）。  
> 2) 角→辺：`sidesFromAnglesHyperbolic`（安全な `acosh` を含む）。  
> 3) ハイパーボロイド配置→ポアンカレ射影：`placeOnHyperboloidAndProjectToDisk`。  
> 4) 2 点から測地線円（or 直径）を返す `geodesicThrough`。  
> 5) ユニットテスト： (p,q,r) = (3,3,7), (3,4,5), (4,4,5) などで、直交条件・内角一致を検証。  
> 6) JSDoc と数値安定性の注意をソースに明記。

---

## 備考

- 本手順は**根探索を行わず**、閉形式＋一次連立で構成可能。  
- 既存コードの `solveThirdMirror`/`circleFromParameter` は不要。  
- ハイパーボロイド → 円板の組み合わせは、配置の自由度（等長等角の等長写像群）を**連続に**固定できる利点がある。
