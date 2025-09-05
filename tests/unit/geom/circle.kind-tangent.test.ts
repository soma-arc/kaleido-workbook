import { describe, it, expect } from "vitest";
import { circleCircleIntersection } from "../../../src/geom/circle";
import type { Circle } from "../../../src/geom/types";

describe("circleCircleIntersection kind: tangent (external)", () => {
    it("returns kind 'tangent' for external tangency", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 10, y: 0 }, r: 5 }; // tangent at (5,0)
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("tangent");
        // coordinates are covered in M3; here we assert kind only
    });
});
