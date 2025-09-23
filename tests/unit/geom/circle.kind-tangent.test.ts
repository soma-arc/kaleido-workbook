import { describe, expect, it } from "vitest";
import type { Circle } from "@/geom/core/types";
import { circleCircleIntersection } from "@/geom/primitives/circle";

describe("circleCircleIntersection kind: tangent (external)", () => {
    it("returns kind 'tangent' for external tangency", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 10, y: 0 }, r: 5 }; // tangent at (5,0)
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("tangent");
        // coordinates are covered in M3; here we assert kind only
    });
});
