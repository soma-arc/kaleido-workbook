import { describe, expect, it } from "vitest";
import { safeSqrt } from "@/geom/core/math";

describe("math.safeSqrt", () => {
    it("clamps small negative to 0", () => {
        expect(safeSqrt(-1e-15)).toBe(0);
    });

    it("computes sqrt for positive numbers", () => {
        expect(safeSqrt(4)).toBe(2);
    });
});
