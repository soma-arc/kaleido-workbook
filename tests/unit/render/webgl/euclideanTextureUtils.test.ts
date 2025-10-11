import { describe, expect, it } from "vitest";
import { computeReflectiveUV, mirrorRepeat } from "@/render/webgl/euclideanTextureUtils";
import { IDENTITY_UV_TRANSFORM } from "@/render/webgl/textures";

describe("euclidean texture reflection", () => {
    it("folds coordinates into the unit interval", () => {
        expect(mirrorRepeat(-0.25)).toBeCloseTo(0.25, 12);
        expect(mirrorRepeat(0.25)).toBeCloseTo(0.25, 12);
        expect(mirrorRepeat(1.25)).toBeCloseTo(0.75, 12);
        expect(mirrorRepeat(2.25)).toBeCloseTo(0.25, 12);
    });

    it("reflects world coordinates across preset rectangle bounds", () => {
        const uv = computeReflectiveUV({ x: 0, y: 0 }, IDENTITY_UV_TRANSFORM);
        expect(uv.u).toBeCloseTo(0.5, 12);
        expect(uv.v).toBeCloseTo(0.5, 12);

        const reflected = computeReflectiveUV({ x: 1.6, y: -1.2 }, IDENTITY_UV_TRANSFORM);
        expect(reflected.u).toBeCloseTo(0.7, 12);
        expect(reflected.v).toBeCloseTo(0.1, 12);
    });

    it("handles anisotropic scale and rotation", () => {
        const transform = {
            offset: { x: 0.5, y: 0.5 },
            scale: { x: 0.25, y: 0.75 },
            rotation: Math.PI / 4,
        } as const;
        const uv = computeReflectiveUV({ x: 0.5, y: 0.1 }, transform);
        expect(uv.u).toBeGreaterThanOrEqual(0);
        expect(uv.u).toBeLessThanOrEqual(1);
        expect(uv.v).toBeGreaterThanOrEqual(0);
        expect(uv.v).toBeLessThanOrEqual(1);
    });
});
