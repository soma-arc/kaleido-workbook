import { describe, expect, it } from "vitest";
import { circleCircleIntersection } from "../../../src/geom/circle";
import type { Circle } from "../../../src/geom/types";

describe("circleCircleIntersection kind: concentric", () => {
    it("returns kind 'concentric' when centers coincide but radii differ", () => {
        const A: Circle = { c: { x: 1, y: 2 }, r: 5 };
        const B: Circle = { c: { x: 1, y: 2 }, r: 3 };
        const out = circleCircleIntersection(A, B);
        expect(out.kind).toBe("concentric");
    });
});
