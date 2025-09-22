import { describe, expect, it } from "vitest";
import type { Circle } from "@/geom/core/types";
import { circleCircleIntersection } from "@/geom/primitives/circle";

describe("circleCircleIntersection point: tangent single point", () => {
    it("external tangency -> (5,0)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 10, y: 0 }, r: 5 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("tangent");
        const pts = out.points ?? [];
        expect(pts.length).toBe(1);
        const p0 = pts[0];
        expect(p0.x).toBeCloseTo(5, 12);
        expect(p0.y).toBeCloseTo(0, 12);
    });

    it("internal tangency -> (5,0)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 2, y: 0 }, r: 3 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("tangent");
        const pts = out.points ?? [];
        expect(pts.length).toBe(1);
        const p0 = pts[0];
        expect(p0.x).toBeCloseTo(5, 12);
        expect(p0.y).toBeCloseTo(0, 12);
    });
});
