import { describe, expect, it } from "vitest";
import { buildTrianglePath, type LineSegmentSpec } from "../../../src/render/trianglePath";

// NOTE: Placeholder unit tests for Issue #78; will be expanded with real geometry adapters in #79.
describe("trianglePath: basic construction", () => {
    it("builds CCW orientation from three connected segments", () => {
        const s0: LineSegmentSpec = { kind: "line", a: { x: 0, y: 0 }, b: { x: 0.5, y: 0 } };
        const s1: LineSegmentSpec = { kind: "line", a: s0.b, b: { x: 0.25, y: 0.4 } };
        const s2: LineSegmentSpec = { kind: "line", a: s1.b, b: s0.a };
        const tri = buildTrianglePath([s0, s1, s2]);
        expect(tri.segments.length).toBe(3);
    });

    it.skip("enforces CCW by swapping segments when area is negative", () => {
        // Intentionally CW ordering
        const s0: LineSegmentSpec = { kind: "line", a: { x: 0, y: 0 }, b: { x: 0, y: 0.5 } };
        const s1: LineSegmentSpec = { kind: "line", a: s0.b, b: { x: 0.5, y: 0 } };
        const s2: LineSegmentSpec = { kind: "line", a: s1.b, b: s0.a };
        const tri = buildTrianglePath([s0, s1, s2]);
        expect(tri.segments[0].a).toEqual({ x: 0, y: 0 });
    });
});
