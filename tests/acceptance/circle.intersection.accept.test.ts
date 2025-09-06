import { circleCircleIntersection } from "../../src/geom/circle";
import type { Circle } from "../../src/geom/types";

const A: Circle = { c: { x: 0, y: 0 }, r: 5 };

test("two intersections (r=5 @ (0,0) and r=5 @ (8,0)) -> (4,±3)", () => {
    const B: Circle = { c: { x: 8, y: 0 }, r: 5 };
    const r = circleCircleIntersection(A, B);
    expect(r.kind).toBe("two");
    const pts = r.points!;
    expect(pts).toHaveLength(2);
    // x=4、y=±3 を許容誤差内で
    const ok =
        pts.some((p) => Math.abs(p.x - 4) < 1e-12 && Math.abs(p.y - 3) < 1e-12) &&
        pts.some((p) => Math.abs(p.x - 4) < 1e-12 && Math.abs(p.y + 3) < 1e-12);
    expect(ok).toBe(true);
});

test("external tangent (B at (10,0), r=5) -> tangent @ (5,0)", () => {
    const B: Circle = { c: { x: 10, y: 0 }, r: 5 };
    const r = circleCircleIntersection(A, B);
    expect(r.kind).toBe("tangent");
    expect(r.points![0].x).toBeCloseTo(5, 12);
    expect(r.points![0].y).toBeCloseTo(0, 12);
});

test("internal tangent (B at (2,0), r=3) -> tangent @ (5,0)", () => {
    const B: Circle = { c: { x: 2, y: 0 }, r: 3 };
    const r = circleCircleIntersection(A, B);
    expect(r.kind).toBe("tangent");
    expect(r.points![0].x).toBeCloseTo(5, 12);
    expect(r.points![0].y).toBeCloseTo(0, 12);
});

test("separated (B at (20,0), r=5) -> none", () => {
    const B: Circle = { c: { x: 20, y: 0 }, r: 5 };
    const r = circleCircleIntersection(A, B);
    expect(r.kind).toBe("none");
});

test("concentric different radii -> concentric", () => {
    const B: Circle = { c: { x: 0, y: 0 }, r: 3 };
    const r = circleCircleIntersection(A, B);
    expect(r.kind).toBe("concentric");
});

test("coincident (same circle) -> coincident", () => {
    const B: Circle = { c: { x: 0, y: 0 }, r: 5 };
    const r = circleCircleIntersection(A, B);
    expect(r.kind).toBe("coincident");
});
