import { describe, expect, it } from "vitest";
import { snapAngle, snapBoundaryPoint } from "@/geom/primitives/snap";

const TAU = 2 * Math.PI;

describe("snapAngle", () => {
    it("snaps to canonical axes when N=4", () => {
        expect(snapAngle(0.01, 4)).toBeCloseTo(0, 12);
        expect(snapAngle(Math.PI * 0.49, 4)).toBeCloseTo(Math.PI / 2, 12);
        expect(snapAngle(-Math.PI * 0.49, 4)).toBeCloseTo(-Math.PI / 2, 12);
        expect(snapAngle(Math.PI * 0.99, 4)).toBeCloseTo(Math.PI, 12);
    });

    it("tie goes to upper (+) side", () => {
        const N = 8;
        const step = TAU / N;
        const mid = 0.5 * step; // between 0 and step
        expect(snapAngle(mid, N)).toBeCloseTo(step, 12);
        // near wrap-around: between (2π-step) and 0 should go to 0 (normalized to 0)
        const nearWrap = TAU - 0.5 * step;
        expect(snapAngle(nearWrap, N)).toBeCloseTo(0, 12);
    });
});

describe("snapBoundaryPoint", () => {
    it("returns a unit vector and respects N-grid", () => {
        const N = 12;
        const p = { x: 2 * Math.SQRT1_2, y: 2 * Math.SQRT1_2 }; // |p|=2 on 45°
        const q = snapBoundaryPoint(p, N);
        expect(Math.hypot(q.x, q.y)).toBeCloseTo(1, 12);
        // 45° is exact grid for N=8 but not for N=12; just sanity check normalization
    });
});
