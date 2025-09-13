import { describe, expect, it } from "vitest";
import { circleCircleIntersection } from "../../../src/geom/circle";
import type { Circle } from "../../../src/geom/types";

describe("circleCircleIntersection point: tangent single point", () => {
    it("external tangency -> (5,0)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 10, y: 0 }, r: 5 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("tangent");
        expect(out.points).toBeDefined();
        expect(out.points!).toHaveLength(1);
        expect(out.points![0].x).toBeCloseTo(5, 12);
        expect(out.points![0].y).toBeCloseTo(0, 12);
    });

    it("internal tangency -> (5,0)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 2, y: 0 }, r: 3 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("tangent");
        expect(out.points).toBeDefined();
        expect(out.points!).toHaveLength(1);
        expect(out.points![0].x).toBeCloseTo(5, 12);
        expect(out.points![0].y).toBeCloseTo(0, 12);
    });
});
