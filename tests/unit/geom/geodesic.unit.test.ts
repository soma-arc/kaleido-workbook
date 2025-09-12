import { describe, it, expect } from "vitest";
import { geodesicFromBoundary } from "../../../src/geom/geodesic";
import type { Vec } from "../../../src/geom/types";

const pt = (t: number): Vec => ({ x: Math.cos(t), y: Math.sin(t) });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const norm2 = (v: Vec) => v.x * v.x + v.y * v.y;

describe("geodesicFromBoundary", () => {
    it("returns circle kind for generic pair (not opposite)", () => {
        const a = pt(0.3);
        const b = pt(1.7);
        const g = geodesicFromBoundary(a, b);
        if (g.kind !== "circle") throw new Error("expected circle kind");
        // passes through endpoints
        const da = Math.hypot(a.x - g.c.x, a.y - g.c.y);
        const db = Math.hypot(b.x - g.c.x, b.y - g.c.y);
        expect(da).toBeCloseTo(g.r, 12);
        expect(db).toBeCloseTo(g.r, 12);
        // orthogonality: |c|^2 = 1 + r^2
        expect(norm2(g.c)).toBeCloseTo(1 + g.r * g.r, 12);
        // alternative condition: a·c = b·c = 1
        expect(dot(a, g.c)).toBeCloseTo(1, 12);
        expect(dot(b, g.c)).toBeCloseTo(1, 12);
    });

    it("returns diameter for opposite endpoints", () => {
        const a = pt(0.8);
        const b = pt(0.8 + Math.PI);
        const g = geodesicFromBoundary(a, b);
        if (g.kind !== "diameter") throw new Error("expected diameter kind");
        // dir should be parallel to a (or -a)
        const cross = g.dir.x * a.y - g.dir.y * a.x;
        expect(Math.abs(cross)).toBeCloseTo(0, 12);
        // dir is unit
        expect(Math.hypot(g.dir.x, g.dir.y)).toBeCloseTo(1, 12);
    });

    it("throws on degenerate equal endpoints", () => {
        const a = pt(-0.2);
        expect(() => geodesicFromBoundary(a, a)).toThrow();
    });
});
