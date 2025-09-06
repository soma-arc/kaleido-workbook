import { test, fc } from "@fast-check/vitest";
import { circleCircleIntersection } from "../../src/geom/circle";
import type { Circle, IntersectResult, Vec } from "../../src/geom/types";

const range = 20;

const vecArb = fc.record({
    x: fc.double({ min: -range, max: range, noDefaultInfinity: true, noNaN: true }),
    y: fc.double({ min: -range, max: range, noDefaultInfinity: true, noNaN: true }),
});

const circleArb: fc.Arbitrary<Circle> = fc.record({
    c: vecArb,
    r: fc.double({ min: 0.1, max: range, noDefaultInfinity: true, noNaN: true }),
});

function isTwoOrTangent(r: IntersectResult): r is IntersectResult & { points: Vec[] } {
    return (r.kind === "two" || r.kind === "tangent") && Array.isArray(r.points);
}

function sortPts(pts: Vec[]): Vec[] {
    return [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
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

describe("circleCircleIntersection properties (fast-check)", () => {
    test.prop([circleArb, circleArb])("points satisfy both circle equations (two/tangent)", (A, B) => {
        const r = circleCircleIntersection(A, B);
        if (!isTwoOrTangent(r)) return true;
        for (const p of r.points!) {
            const da = Math.hypot(p.x - A.c.x, p.y - A.c.y);
            const db = Math.hypot(p.x - B.c.x, p.y - B.c.y);
            // Precision baseline 1e-12 via toBeCloseTo(..., 12)
            expect(da).toBeCloseTo(A.r, 12);
            expect(db).toBeCloseTo(B.r, 12);
        }
        return true;
    });

    test.prop([
        circleArb,
        circleArb,
        fc.double({ min: -Math.PI, max: Math.PI, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.1, max: 5, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: -10, max: 10, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: -10, max: 10, noDefaultInfinity: true, noNaN: true }),
    ])("invariance under translation, rotation, and uniform scale", (A, B, angle, s, tx, ty) => {
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
        return true;
    });

    test.prop([circleArb, circleArb])("input order symmetry", (A, B) => {
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
        return true;
    });
});
