INSTRUCTIONS FOR CODEX — Build geodesic circles of a hyperbolic (p,q,r) triangle in the Poincaré disk, with Euclidean-limit continuity
--------------------------------------------------------------------------------

Goal
- Input: integers p,q,r with 1/p + 1/q + 1/r < 1.
- Output: the three geodesics (each as either a diameter or a circle orthogonal to the unit circle) that bound the hyperbolic triangle with angles α=π/p, β=π/q, γ=π/r, plus the three vertex coordinates in the unit disk.
- No root finding. Use closed-form formulas and a small linear solve only.

High-level plan
1) From (p,q,r) compute α,β,γ.
2) Use angle version of the hyperbolic cosine law to obtain side lengths a,b,c (hyperbolic).
3) Place vertices A,B,C on the hyperboloid H² and project to the Poincaré disk to get A′,B′,C′.
4) For each edge, return the unique geodesic through the two opposite vertices in the disk:
   - If O,P,Q are collinear (O is origin), the geodesic is a diameter (line through O).
   - Otherwise solve a 2×2 linear system to get the orthogonal-circle center c; radius r = sqrt(|c|² − 1).

Optional “Euclidean-limit” scale (for when you also need a Euclidean triangle that is continuous at S=α+β+γ→π):
- Define ℓ_i := sqrt(2*(cosh(a_i) − 1)) for i∈{a,b,c}.  
- If you want visual continuity with the disk when c is placed on the x-axis as ±t with t = tanh(c/4), set scale s := (2*t)/ℓ_c and use ℓ′_i = s*ℓ_i.  
- If not needed, skip this; it does not affect geodesic computation.

Details

Angles:
- α = π/p, β = π/q, γ = π/r
- Require α + β + γ < π (hyperbolic).

Side lengths from angles (hyperbolic angle cosine law):
- cosh a = (cos α + cos β cos γ) / (sin β sin γ)
- cosh b = (cos β + cos γ cos α) / (sin γ sin α)
- cosh c = (cos γ + cos α cos β) / (sin α sin β)
- For numerical safety: acosh(x) = log(x + sqrt(x² − 1)), but clamp x := max(1, x).

Hyperboloid placement and projection to the disk (closed form):
- Work in H² = { (x0,x1,x2) : x0² − x1² − x2² = 1, x0>0 } with Lorentz inner product ⟨X,Y⟩ = x0 y0 − x1 y1 − x2 y2.
- Place:
  A = (1, 0, 0)
  B = (cosh c, sinh c, 0)
  C = (x0, x1, x2) with
    x0 = cosh b
    x1 = (cosh c * cosh b − cosh a) / sinh c
    x2 = +sqrt( x0² − x1² − 1 )      // choose + to fix a continuous branch (upper half)
- Project to Poincaré disk via:
  (u,v) = (x1, x2) / (x0 + 1)
  Hence:
    A′ = (0, 0)
    B′ = (sinh c / (cosh c + 1), 0)
    C′ = (x1/(x0+1), x2/(x0+1))

Geodesic through two disk points P, Q
- A geodesic is either:
  (i) a diameter (a line through the origin), or
  (ii) a circle orthogonal to the unit circle S¹.
- Quick diameter test: if det([P,Q]) = P.x*Q.y − P.y*Q.x ≈ 0, return diameter with direction dir = P+Q (any nonzero multiple is fine).
- Otherwise solve for the circle center c = (cx,cy) using two linear equations:

  Let M = (P+Q)/2 and D = Q−P.
  Equations:
    (1) D · c = D · M             // c lies on the perpendicular bisector of segment PQ
    (2) P · c = (1 + |P|²)/2      // derived from “|c|² − r² = 1” and “|P−c|² = r²”
  Solve the 2×2 system:
    [ D.x  D.y ] [cx] = [ D·M ]
    [ P.x  P.y ] [cy]   [ (1+|P|²)/2 ]
  If nearly singular, switch the second row to use Q instead of P:
    [ D.x  D.y ] [cx] = [ D·M ]
    [ Q.x  Q.y ] [cy]   [ (1+|Q|²)/2 ]
  Radius:
    r = sqrt( |c|² − 1 )

Return structure:
- vertices: [A′, B′, C′]
- edges: three geodesics:
    edge a: through (B′, C′)   // opposite A
    edge b: through (C′, A′)   // opposite B
    edge c: through (A′, B′)   // opposite C
- angles: [α, β, γ]
- sides:  [a, b, c]

TypeScript Skeleton (implement exactly)

```ts
type Vec2 = { x: number; y: number };

type Geodesic =
  | { kind: "diameter"; dir: Vec2 }
  | { kind: "orthocircle"; c: Vec2; r: number };

interface HyperbolicTriangleDisks {
  vertices: [Vec2, Vec2, Vec2];
  edges: [Geodesic, Geodesic, Geodesic];
  angles: [number, number, number];
  sides: [number, number, number];
}

function anglesFromPQR(p: number, q: number, r: number): [number, number, number] {
  if (!(p > 1 && q > 1 && r > 1)) throw new Error("p,q,r must be > 1");
  const a = Math.PI / p, b = Math.PI / q, c = Math.PI / r;
  if (a + b + c >= Math.PI) throw new Error("Not hyperbolic: α+β+γ >= π");
  return [a, b, c];
}

function safeAcosh(x: number): number {
  const xx = Math.max(1, x);
  return Math.log(xx + Math.sqrt(xx * xx - 1));
}

function sidesFromAnglesHyperbolic(alpha: number, beta: number, gamma: number) {
  const Sbg = Math.sin(beta) * Math.sin(gamma);
  const Sga = Math.sin(gamma) * Math.sin(alpha);
  const Sab = Math.sin(alpha) * Math.sin(beta);
  const ca = (Math.cos(alpha) + Math.cos(beta) * Math.cos(gamma)) / Sbg;
  const cb = (Math.cos(beta) + Math.cos(gamma) * Math.cos(alpha)) / Sga;
  const cc = (Math.cos(gamma) + Math.cos(alpha) * Math.cos(beta)) / Sab;
  return { a: safeAcosh(ca), b: safeAcosh(cb), c: safeAcosh(cc) };
}

function placeOnHyperboloidAndProjectToDisk(a: number, b: number, c: number): [Vec2, Vec2, Vec2] {
  const ch_c = Math.cosh(c), sh_c = Math.sinh(c);
  const x0 = Math.cosh(b);
  const x1 = (ch_c * x0 - Math.cosh(a)) / sh_c;
  const disc = x0 * x0 - x1 * x1 - 1;
  const x2 = Math.sqrt(Math.max(0, disc)); // choose + branch for continuity

  const A: Vec2 = { x: 0, y: 0 };
  const B: Vec2 = { x: sh_c / (ch_c + 1), y: 0 };
  const C: Vec2 = { x: x1 / (x0 + 1), y: x2 / (x0 + 1) };
  return [A, B, C];
}

function geodesicThrough(P: Vec2, Q: Vec2): Geodesic {
  const cross = P.x * Q.y - P.y * Q.x;
  if (Math.abs(cross) < 1e-14) {
    return { kind: "diameter", dir: { x: P.x + Q.x, y: P.y + Q.y } };
  }
  const M = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
  const D = { x: Q.x - P.x, y: Q.y - P.y };

  let A11 = D.x, A12 = D.y, B1 = D.x * M.x + D.y * M.y;
  let A21 = P.x, A22 = P.y, B2 = (1 + P.x * P.x + P.y * P.y) / 2;
  let det = A11 * A22 - A12 * A21;

  let cx: number, cy: number;
  if (Math.abs(det) < 1e-14) {
    A21 = Q.x; A22 = Q.y; B2 = (1 + Q.x * Q.x + Q.y * Q.y) / 2;
    det = A11 * A22 - A12 * A21;
    if (Math.abs(det) < 1e-14) throw new Error("Degenerate geodesic center");
  }
  cx = (B1 * A22 - A12 * B2) / det;
  cy = (A11 * B2 - B1 * A21) / det;

  const c = { x: cx, y: cy };
  const r2 = c.x * c.x + c.y * c.y - 1;
  const r = Math.sqrt(Math.max(0, r2));
  return { kind: "orthocircle", c, r };
}

export function computeHyperbolicTriangleDisks(p: number, q: number, r: number): HyperbolicTriangleDisks {
  const [alpha, beta, gamma] = anglesFromPQR(p, q, r);
  const { a, b, c } = sidesFromAnglesHyperbolic(alpha, beta, gamma);
  const [A, B, C] = placeOnHyperboloidAndProjectToDisk(a, b, c);

  const e_a = geodesicThrough(B, C); // opposite A
  const e_b = geodesicThrough(C, A); // opposite B
  const e_c = geodesicThrough(A, B); // opposite C

  return {
    vertices: [A, B, C],
    edges: [e_a, e_b, e_c],
    angles: [alpha, beta, gamma],
    sides: [a, b, c],
  };
}
```

Numerical notes
- Clamp acosh input: x := max(1, x).
- When computing x2 = sqrt(x0² − x1² − 1), clamp the radicand by max(0, •).
- Diameter threshold (for det≈0) may be tuned per rendering scale, e.g., 1e−12 to 1e−8.

Optional Euclidean-limit scale (only if you need a Euclidean triangle consistent with the disk view)
- t = tanh(c/4), disk chord for AB is 2t.
- Define ℓ_i = sqrt(2*(cosh(a_i) − 1)), then set s = (2*t)/ℓ_c and ℓ′_i = s*ℓ_i.
- If your pipeline instead expects c=1, use s = 1/ℓ_c.
- This scaling does not change geodesic computation; it is for Euclidean drawing continuity only.

End of instructions.
