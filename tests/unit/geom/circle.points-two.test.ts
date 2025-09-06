import { describe, it, expect } from "vitest";
import { circleCircleIntersection } from "../../../src/geom/circle";
import type { Circle } from "../../../src/geom/types";

describe("circleCircleIntersection points: two intersections", () => {
    it("returns (4,±3) for A(0,0,r=5), B(8,0,r=5)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 8, y: 0 }, r: 5 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("two");
        const pts = out.points!;
        expect(pts).toHaveLength(2);
        // Sorted x→y should be (4,-3), (4,3)
        expect(pts[0].x).toBeCloseTo(4, 12);
        expect(pts[0].y).toBeCloseTo(-3, 12);
        expect(pts[1].x).toBeCloseTo(4, 12);
        expect(pts[1].y).toBeCloseTo(3, 12);
    });
});
