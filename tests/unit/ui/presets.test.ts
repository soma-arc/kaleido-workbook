import { describe, expect, it } from "vitest";
import { getPresetsForGeometry } from "../../../src/ui/trianglePresets";

function reciprocalSum(p: number, q: number, r: number): number {
    return 1 / p + 1 / q + 1 / r;
}

describe("getPresetsForGeometry", () => {
    it("returns hyperbolic presets that satisfy the strict inequality", () => {
        const presets = getPresetsForGeometry("hyperbolic");
        expect(presets.length).toBeGreaterThan(0);
        for (const preset of presets) {
            const sum = reciprocalSum(preset.p, preset.q, preset.r);
            expect(sum).toBeLessThan(1);
        }
    });

    it("returns euclidean presets that are on the equality boundary", () => {
        const presets = getPresetsForGeometry("euclidean");
        expect(presets.length).toBeGreaterThan(0);
        for (const preset of presets) {
            const sum = reciprocalSum(preset.p, preset.q, preset.r);
            expect(sum).toBeCloseTo(1, 12);
        }
    });

    it("returns spherical presets that exceed the euclidean boundary", () => {
        const presets = getPresetsForGeometry("spherical");
        expect(presets.length).toBeGreaterThan(0);
        for (const preset of presets) {
            const sum = reciprocalSum(preset.p, preset.q, preset.r);
            expect(sum).toBeGreaterThan(1);
        }
    });
});
