import { describe, expect, it } from "vitest";

import { validateTriangleParams } from "../../../src/geom/triangleParams";

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

    it("rejects triples that do not satisfy 1/p + 1/q + 1/r < 1", () => {
        const result = validateTriangleParams({ p: 2, q: 3, r: 6 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain("1/p + 1/q + 1/r must be < 1");
        }
    });
});
