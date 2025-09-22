import type { Vec2 } from "@/geom/core/types";
import type { Geodesic } from "@/geom/primitives/geodesic";
import { geodesicFromBoundary } from "@/geom/primitives/geodesic";
import type { HyperbolicTrianglePrimitives } from "@/geom/triangle/types";

/**
 * Construct canonical hyperbolic triangle primitives on the Poincaré unit disk.
 *
 * Overview
 * - Mirrors are Poincaré geodesics (diameter or circle) whose interior angles are (π/p, π/q, π/r).
 * - The triangle is placed in a canonical pose: g1 on the x-axis, g2 rotated by α = π/p,
 *   g3 an orthogonal circle in the upper half plane.
 * - The resulting primitive set only encodes mirrors/vertices/angles so that higher level tiling
 *   code can operate on geometric primitives without embedding tiling semantics here.
 */

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function dir(theta: number): Vec2 {
    return { x: Math.cos(theta), y: Math.sin(theta) };
}

/**
 * solveForThirdMirror
 * Given α,β,γ, compute the circle (c,r) of g3 satisfying:
 * - orthogonality to the unit circle (|c|^2 − r^2 = 1)
 * - angle at v1=g1∩g3 equals β, and at v2=g2∩g3 equals γ
 *
 * Parameterization:
 * - Let g1 be the x‑axis diameter and g2 a diameter with unit direction u=(cosα,sinα).
 * - Write a one‑parameter family by t∈(0,1): cx=(1+t²)/(2t), dx=t−cx, cy=|dx|/tanβ, r=hypot(dx,cy)
 * - For the angle at Q=v2 on g2 we evaluate angleAtQ(t) via circle tangent and u.
 * - Solve f(t)=angleAtQ(t)−γ=0 with bracketing+bisection; if no sign change is detected,
 *   perform a short secant refinement around mid‑range and return the resulting circle.
 */
function solveForThirdMirror(alpha: number, beta: number, gamma: number): { c: Vec2; r: number } {
    // g1: x‑axis diameter; g2: diameter rotated by alpha
    // P = g1∩g3 angle is beta; Q = g2∩g3 angle is gamma.
    const u = dir(alpha);

    const angleAtQ = (t: number): number => {
        // 与えた t に対し、beta を満たす cy を決定し、その上で Q 側角度を返す
        const cx = (1 + t * t) / (2 * t);
        const dx = t - cx; // = (t^2 - 1) / (2t)
        const cy = Math.abs(dx) / Math.tan(beta);
        const r = Math.hypot(dx, cy);
        const cdotu = cx * u.x + cy * u.y;
        // cc - r^2 = 1 により判別式は cdotu^2 - 1
        const disc = Math.max(0, cdotu * cdotu - 1);
        const s = cdotu - Math.sqrt(disc);
        const qx = s * u.x,
            qy = s * u.y;
        const nx = (qx - cx) / r,
            ny = (qy - cy) / r; // 半径方向の単位ベクトル
        const dot = Math.abs(nx * u.x + ny * u.y); // tangent と u の角 = asin(|dot(n,u)|)
        return Math.asin(clamp(dot, 0, 1));
    };

    // Solve f(t)=angleAtQ(t)-gamma over t∈(0,1)
    const f = (t: number) => angleAtQ(t) - gamma;

    // ブラケット探索
    let a = 0.1,
        b = 0.9;
    let fa = f(a),
        fb = f(b);
    if (fa * fb > 0) {
        // 粗探索で符号反転区間を探す
        const N = 20;
        let prevT = a,
            prevF = fa;
        let found = false;
        for (let i = 1; i <= N; i++) {
            const t = a + ((b - a) * i) / N;
            const ft = f(t);
            if (prevF * ft <= 0) {
                a = prevT;
                b = t;
                fa = prevF;
                fb = ft;
                found = true;
                break;
            }
            prevT = t;
            prevF = ft;
        }
        if (!found) {
            // 近い最小値で代替（secant 2ステップ）
            let t0 = 0.5,
                t1 = 0.6;
            let f0 = f(t0),
                f1 = f(t1);
            for (let i = 0; i < 12; i++) {
                const dt = (t1 - t0) / Math.max(1e-6, f1 - f0);
                const t2 = clamp(t1 - f1 * dt, 0.05, 0.95);
                t0 = t1;
                f0 = f1;
                t1 = t2;
                f1 = f(t1);
            }
            const cx = (1 + t1 * t1) / (2 * t1);
            const dx = t1 - cx;
            const cy = Math.abs(dx) / Math.tan(beta);
            const r = Math.hypot(dx, cy);
            return { c: { x: cx, y: cy }, r };
        }
    }

    // Bisection with fixed iteration/thresholds
    for (let i = 0; i < 60; i++) {
        const m = 0.5 * (a + b);
        const fm = f(m);
        if (Math.abs(fm) < 5e-4 || Math.abs(b - a) < 1e-6) {
            const cx = (1 + m * m) / (2 * m);
            const dx = m - cx;
            const cy = Math.abs(dx) / Math.tan(beta);
            const r = Math.hypot(dx, cy);
            return { c: { x: cx, y: cy }, r };
        }
        if (fa * fm <= 0) {
            b = m;
            fb = fm;
        } else {
            a = m;
            fa = fm;
        }
    }
    const m = 0.5 * (a + b);
    const cx = (1 + m * m) / (2 * m);
    const dx = m - cx;
    const cy = Math.abs(dx) / Math.tan(beta);
    const r = Math.hypot(dx, cy);
    return { c: { x: cx, y: cy }, r };
}

/**
 * buildHyperbolicTriangle
 * Construct a canonical (p,q,r) hyperbolic triangle primitive set.
 */
export function buildHyperbolicTriangle(
    p: number,
    q: number,
    r: number,
): HyperbolicTrianglePrimitives {
    if (!(p > 1 && q > 1 && r > 1) || 1 / p + 1 / q + 1 / r >= 1) {
        throw new Error("Invalid (p,q,r) for hyperbolic triangle");
    }
    const alpha = Math.PI / p;
    const beta = Math.PI / q;
    const gamma = Math.PI / r;

    // g1, g2: diameters crossing at origin with angle alpha
    // Create as geodesics from boundary: endpoints at angles 0 and π, and at α and α+π
    const g1: Geodesic = geodesicFromBoundary({ x: 1, y: 0 }, { x: -1, y: 0 });
    const aDir = dir(alpha);
    const g2: Geodesic = geodesicFromBoundary(aDir, { x: -aDir.x, y: -aDir.y });

    const third = solveForThirdMirror(alpha, beta, gamma);
    const g3: Geodesic = { kind: "circle", c: third.c, r: third.r };

    // vertices: v0 = origin (g1∩g2), v1 = g1∩g3 on x‑axis, v2 = g2∩g3 on line alpha
    const v0: Vec2 = { x: 0, y: 0 };
    const t = third;
    const cx = t.c.x,
        cy = t.c.y,
        rad = t.r;
    // v1 on x-axis solves (x-cx)^2 + (0-cy)^2 = r^2 -> pick the one in (0,1)
    const dx = Math.sqrt(Math.max(0, rad * rad - cy * cy));
    const cand1 = cx - dx;
    const cand2 = cx + dx;
    const pick = (x: number) => (x > 0 && x < 1 ? x : NaN);
    let x1 = Number.isFinite(pick(cand1)) ? cand1 : cand2;
    if (!(x1 > 0 && x1 < 1)) x1 = Math.max(1e-6, Math.min(0.999, cand1));
    const v1: Vec2 = { x: x1, y: 0 };

    // v2 on line through origin with direction aDir: s·u with |s·u − c| = r
    const cdotu = cx * aDir.x + cy * aDir.y;
    const disc = cdotu * cdotu - (cx * cx + cy * cy - rad * rad);
    const root = Math.sqrt(Math.max(0, disc));
    const s = cdotu - root;
    const v2: Vec2 = { x: s * aDir.x, y: s * aDir.y };

    return {
        kind: "hyperbolic",
        mirrors: [g1, g2, g3],
        vertices: [v0, v1, v2],
        angles: [alpha, beta, gamma],
    };
}

/** @deprecated Prefer buildHyperbolicTriangle */
export const buildFundamentalTriangle = buildHyperbolicTriangle;
