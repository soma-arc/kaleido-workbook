import { describe, it, expect } from "vitest";
import { circleCircleIntersection } from "../../../src/geom/circle";
import type { Circle } from "../../../src/geom/types";

describe("circleCircleIntersection kind: coincident", () => {
    it("returns kind 'coincident' when circles are identical", () => {
        const A: Circle = { c: { x: -2, y: 3 }, r: 4 };
        const B: Circle = { c: { x: -2, y: 3 }, r: 4 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("coincident");
    });
});
