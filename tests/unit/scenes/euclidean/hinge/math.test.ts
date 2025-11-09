import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import { computeHingeAngles } from "@/scenes/euclidean/hinge/math";

let controlCounter = 0;

function buildHingePair(free: { id?: string; x: number; y: number }): HalfPlaneControlPoints {
    const resolvedId = free.id ?? `free-${controlCounter++}`;
    return [
        { id: "hinge", x: 0, y: 0, fixed: true },
        { id: resolvedId, x: free.x, y: free.y, fixed: false },
    ];
}

describe("computeHingeAngles", () => {
    it("returns plane directions and hinge angle when both handles are valid", () => {
        const planeA = buildHingePair({ id: "free-a", x: 0, y: 1 });
        const planeB = buildHingePair({ id: "free-b", x: 1, y: 0 });

        const result = computeHingeAngles([planeA, planeB]);

        expect(result.planeAngles).toEqual([90, 0]);
        expect(result.hingeAngle).toBe(90);
    });

    it("normalizes negative angles and rounds to tenths", () => {
        const planeA = buildHingePair({ id: "free-a", x: 1, y: -1 });
        const planeB = buildHingePair({ id: "free-b", x: -1, y: -1 });

        const result = computeHingeAngles([planeA, planeB]);

        expect(result.planeAngles).toEqual([315, 225]);
        expect(result.hingeAngle).toBe(90);
    });

    it("returns nulls when vectors are invalid", () => {
        const zeroVector = buildHingePair({ id: "free-a", x: 0, y: 0 });
        const planeB = buildHingePair({ id: "free-b", x: 0, y: 1 });

        const result = computeHingeAngles([zeroVector, planeB]);

        expect(result.planeAngles).toEqual([null, 90]);
        expect(result.hingeAngle).toBeNull();
    });

    it("handles missing control pairs", () => {
        const planeA = buildHingePair({ id: "free-a", x: 0, y: 1 });

        const result = computeHingeAngles([planeA]);

        expect(result.planeAngles).toEqual([90, null]);
        expect(result.hingeAngle).toBeNull();
    });
});
