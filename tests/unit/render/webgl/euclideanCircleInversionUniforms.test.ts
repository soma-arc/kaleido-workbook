import { describe, expect, it } from "vitest";
import { computeLineUniforms } from "@/render/webgl/pipelines/euclideanCircleInversionPipeline";
import type { CircleInversionState } from "@/ui/scenes/circleInversionConfig";

const BASE_STATE: CircleInversionState = {
    fixedCircle: {
        center: { x: 0, y: 0 },
        radius: 1,
    },
    line: {
        start: { x: -1, y: 0 },
        end: { x: 1, y: 0 },
    },
    rectangle: {
        center: { x: 0.3, y: 0 },
        halfExtents: { x: 0.15, y: 0.1 },
        rotation: 0,
    },
    display: {
        showReferenceLine: true,
        showInvertedLine: true,
        showReferenceRectangle: true,
        showInvertedRectangle: true,
        textureEnabled: true,
    },
};

describe("computeLineUniforms", () => {
    it("returns line coefficients when the reference line passes the inversion center", () => {
        const uniforms = computeLineUniforms(BASE_STATE);
        expect(uniforms.inverted.mode).toBe("line");
        if (uniforms.inverted.mode !== "line") {
            throw new Error("expected line mode");
        }
        expect(uniforms.inverted.line.normal.x).toBeCloseTo(0, 12);
        expect(Math.abs(uniforms.inverted.line.normal.y)).toBeCloseTo(1, 12);
        expect(uniforms.inverted.line.offset).toBeCloseTo(0, 12);
    });

    it("returns circle parameters when the reference line misses the inversion center", () => {
        const state: CircleInversionState = {
            ...BASE_STATE,
            line: {
                start: { x: -2, y: 0.5 },
                end: { x: 2, y: 0.5 },
            },
        };
        const uniforms = computeLineUniforms(state);
        expect(uniforms.inverted.mode).toBe("circle");
        if (uniforms.inverted.mode !== "circle") {
            throw new Error("expected circle mode");
        }
        expect(uniforms.inverted.circle.center.x).toBeCloseTo(0, 12);
        expect(uniforms.inverted.circle.center.y).toBeCloseTo(1, 12);
        expect(uniforms.inverted.circle.radius).toBeCloseTo(1, 12);
    });
});
