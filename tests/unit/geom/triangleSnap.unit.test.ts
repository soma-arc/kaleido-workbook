import { describe, expect, it } from "vitest";
import { snapParameterToPiOverN } from "../../../src/geom/triangleSnap";

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
