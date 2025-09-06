import { describe, it, expect } from "vitest";
import { circleCircleIntersection } from "../../src/geom/circle";
import type { Circle, IntersectResult, Vec } from "../../src/geom/types";

// Simple seeded RNG (LCG) to avoid external dependencies
function lcg(seed: number) {
    let s = seed >>> 0;
    return () => {
        // 32-bit LCG params
        s = (1664525 * s + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

function genCircle(rand: () => number, range = 20): Circle {
    const cx = (rand() * 2 - 1) * range;
    const cy = (rand() * 2 - 1) * range;
    // radius in (0.1, range]
    const r = 0.1 + rand() * range;
    return { c: { x: cx, y: cy }, r };
}

function transformCircle(s: number, angle: number, tx: number, ty: number, c: Circle): Circle {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const x = c.c.x;
    const y = c.c.y;
    const xr = s * (ca * x - sa * y) + tx;
    const yr = s * (sa * x + ca * y) + ty;
    return { c: { x: xr, y: yr }, r: Math.abs(s) * c.r };
}

function transformPoint(s: number, angle: number, tx: number, ty: number, p: Vec): Vec {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const xr = s * (ca * p.x - sa * p.y) + tx;
    const yr = s * (sa * p.x + ca * p.y) + ty;
    return { x: xr, y: yr };
}

function approxEqual(a: number, b: number, eps = 1e-12) {
    return Math.abs(a - b) <= eps;
}

function pointsClose(p: Vec, q: Vec, eps = 1e-12) {
    return approxEqual(p.x, q.x, eps) && approxEqual(p.y, q.y, eps);
}

function sortPts(pts: Vec[]): Vec[] {
    return [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
}

function isTwoOrTangent(r: IntersectResult): r is IntersectResult & { points: Vec[] } {
    return (r.kind === "two" || r.kind === "tangent") && Array.isArray(r.points);
}

describe("circleCircleIntersection properties", () => {
    it("points satisfy both circle equations (two/tangent)", () => {
        const rand = lcg(12345);
        for (let i = 0; i < 200; i++) {
            const A = genCircle(rand);
            const B = genCircle(rand);
            const r = circleCircleIntersection(A, B);
            if (!isTwoOrTangent(r)) continue;
            const pts = r.points!;
            for (const p of pts) {
                const da = Math.hypot(p.x - A.c.x, p.y - A.c.y);
                const db = Math.hypot(p.x - B.c.x, p.y - B.c.y);
                expect(da).toBeCloseTo(A.r, 12);
                expect(db).toBeCloseTo(B.r, 12);
            }
        }
    });

    it("invariance under translation, rotation, and uniform scale", () => {
        const rand = lcg(424242);
        for (let i = 0; i < 150; i++) {
            const A = genCircle(rand);
            const B = genCircle(rand);
            const angle = (rand() * 2 - 1) * Math.PI; // [-pi, pi]
            const s = 0.1 + rand() * 5; // positive scale
            const tx = (rand() * 2 - 1) * 10;
            const ty = (rand() * 2 - 1) * 10;

            const base = circleCircleIntersection(A, B);
            const TA = transformCircle(s, angle, tx, ty, A);
            const TB = transformCircle(s, angle, tx, ty, B);
            const moved = circleCircleIntersection(TA, TB);

            expect(moved.kind).toBe(base.kind);

            if (isTwoOrTangent(base) && isTwoOrTangent(moved)) {
                const baseT = sortPts(base.points!.map((p) => transformPoint(s, angle, tx, ty, p)));
                const movedPts = sortPts(moved.points!);
                expect(movedPts.length).toBe(baseT.length);
                for (let k = 0; k < movedPts.length; k++) {
                    expect(movedPts[k].x).toBeCloseTo(baseT[k].x, 12);
                    expect(movedPts[k].y).toBeCloseTo(baseT[k].y, 12);
                }
            }
        }
    });

    it("input order symmetry", () => {
        const rand = lcg(9876);
        for (let i = 0; i < 200; i++) {
            const A = genCircle(rand);
            const B = genCircle(rand);
            const ab = circleCircleIntersection(A, B);
            const ba = circleCircleIntersection(B, A);
            expect(ba.kind).toBe(ab.kind);
            if (isTwoOrTangent(ab) && isTwoOrTangent(ba)) {
                const p = sortPts(ab.points!);
                const q = sortPts(ba.points!);
                expect(q.length).toBe(p.length);
                for (let k = 0; k < p.length; k++) {
                    expect(q[k].x).toBeCloseTo(p[k].x, 12);
                    expect(q[k].y).toBeCloseTo(p[k].y, 12);
                }
            }
        }
    });
});
