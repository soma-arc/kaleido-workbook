import { describe, it, expect } from "vitest";
import { circleCircleIntersection } from "../../../src/geom/circle";
import type { Circle } from "../../../src/geom/types";

describe("circleCircleIntersection kind: two", () => {
    it("returns kind 'two' for intersecting circles (two points)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 8, y: 0 }, r: 5 }; // (4, ±3)
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("two");
    });
});
