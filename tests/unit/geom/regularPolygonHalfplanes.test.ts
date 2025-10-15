import { describe, expect, it } from "vitest";
import { evaluateHalfPlane } from "@/geom/primitives/halfPlane";
import { generateRegularPolygonHalfplanes } from "@/geom/primitives/regularPolygon";

const TAU = Math.PI * 2;

function angleBetween(v: { x: number; y: number }): number {
    return Math.atan2(v.y, v.x);
}

describe("generateRegularPolygonHalfplanes", () => {
    it("throws when sides < 3", () => {
        expect(() => generateRegularPolygonHalfplanes(2)).toThrowError();
    });

    it("returns unit-norm half-planes equally spaced", () => {
        const sides = 6;
        const planes = generateRegularPolygonHalfplanes(sides);
        expect(planes).toHaveLength(sides);
        const normalizedAngles = planes
            .map((plane) => angleBetween(plane.normal))
            .map((angle) => ((angle % TAU) + TAU) % TAU)
            .sort((a, b) => a - b);
        const step = TAU / sides;
        for (let i = 0; i < sides; i += 1) {
            const expected = i * step;
            const diff = Math.abs(normalizedAngles[i] - expected);
            expect(diff).toBeLessThan(1e-9);
        }
        for (const plane of planes) {
            const anchorValue = evaluateHalfPlane(plane, plane.anchor);
            expect(anchorValue).toBeCloseTo(0, 12);
        }
    });

    it("places the origin inside the polygon", () => {
        const planes = generateRegularPolygonHalfplanes(8);
        for (const plane of planes) {
            const value = evaluateHalfPlane(plane, { x: 0, y: 0 });
            expect(value).toBeGreaterThan(0);
        }
    });
});
