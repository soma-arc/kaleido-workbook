import { describe, expect, it } from "vitest";
import { validateTriangleParams } from "../../../src/geom/triangleParams";
import {
    DEFAULT_PI_OVER_N_MAX,
    snapParameterToPiOverN,
    snapTriangleParams,
} from "../../../src/geom/triangleSnap";

describe("snapParameterToPiOverN", () => {
    it("returns minimum denominator when value is too small", () => {
        expect(snapParameterToPiOverN(0.5)).toBe(2);
        expect(snapParameterToPiOverN(Number.NaN)).toBe(2);
    });

    it("snaps to nearest denominator within range", () => {
        expect(snapParameterToPiOverN(7.1)).toBe(7);
        expect(snapParameterToPiOverN(7.8)).toBe(8);
    });

    it("respects custom nMax upper bound", () => {
        expect(snapParameterToPiOverN(250, { nMax: 180 })).toBe(180);
    });

    it("is idempotent when already on grid", () => {
        for (let n = 2; n <= 10; n += 1) {
            expect(snapParameterToPiOverN(n)).toBe(n);
        }
    });
});

describe("snapTriangleParams", () => {
    it("raises r when anchor locks p and q", () => {
        const result = snapTriangleParams({ p: 3, q: 3, r: 3 }, { locked: { p: true, q: true } });
        expect(result).toEqual({ p: 3, q: 3, r: 4 });
    });

    it("keeps values within nMax", () => {
        const result = snapTriangleParams(
            { p: 3, q: 3, r: 500 },
            { locked: { p: true, q: true }, nMax: 180 },
        );
        expect(result.r).toBeLessThanOrEqual(180);
    });

    it("produces hyperbolic triples when feasible", () => {
        const result = snapTriangleParams(
            { p: 3, q: 3, r: 3 },
            { locked: { p: true, q: true }, nMax: DEFAULT_PI_OVER_N_MAX },
        );
        expect(validateTriangleParams(result).ok).toBe(true);
    });
});
