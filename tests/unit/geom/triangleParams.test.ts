import { describe, expect, it } from "vitest";

import { normalizeDepth, validateTriangleParams } from "../../../src/geom/triangleParams";

describe("validateTriangleParams", () => {
    it("accepts hyperbolic triples", () => {
        const result = validateTriangleParams({ p: 2, q: 3, r: 7 });
        expect(result.ok).toBe(true);
    });

    it("rejects non-integer inputs", () => {
        const result = validateTriangleParams({ p: 2.5, q: 3, r: 7 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain("p must be an integer >= 2");
        }
    });

    it("allows non-integers when integers are optional", () => {
        const result = validateTriangleParams(
            { p: 2.5, q: 3.2, r: 7.9 },
            { requireIntegers: false },
        );
        expect(result.ok).toBe(true);
    });

    it("rejects triples that do not satisfy 1/p + 1/q + 1/r < 1", () => {
        const result = validateTriangleParams({ p: 2, q: 3, r: 6 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain("1/p + 1/q + 1/r must be < 1");
        }
    });
});

describe("normalizeDepth", () => {
    it("rounds to nearest integer and clamps to range", () => {
        expect(normalizeDepth(2.6)).toBe(3);
        expect(normalizeDepth(-1)).toBe(0);
        expect(normalizeDepth(42)).toBe(10);
    });

    it("falls back to minimum for non-finite values", () => {
        expect(normalizeDepth(Number.NaN)).toBe(0);
    });
});
