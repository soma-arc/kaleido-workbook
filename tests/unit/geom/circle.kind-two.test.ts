import { describe, expect, it } from "vitest";
import type { Circle } from "@/geom/core/types";
import { circleCircleIntersection } from "@/geom/primitives/circle";

describe("circleCircleIntersection kind: two", () => {
    it("returns kind 'two' for intersecting circles (two points)", () => {
        const A: Circle = { c: { x: 0, y: 0 }, r: 5 };
        const B: Circle = { c: { x: 8, y: 0 }, r: 5 }; // (4, ±3)
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("two");
    });
});
