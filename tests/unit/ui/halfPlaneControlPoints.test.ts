import { describe, expect, it } from "vitest";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import {
    type ControlPointAssignment,
    controlPointTableFromControls,
    type HalfPlaneControlPoints,
    orientHalfPlaneTowardOrigin,
    resetControlPointIdCounter,
} from "@/geom/primitives/halfPlaneControls";
import { worldToScreen } from "@/render/viewport";
import {
    controlPointsFromHalfPlanes,
    halfPlanesFromControlPoints,
    hitTestControlPoints,
    updateControlPoint,
} from "@/ui/interactions/halfPlaneControlPoints";

const vp = { scale: 100, tx: 0, ty: 0 } as const;

describe("halfPlaneControlPoints interactions", () => {
    it("round-trips planes via control points", () => {
        resetControlPointIdCounter();
        const planes: HalfPlane[] = [
            { normal: { x: 1, y: 0 }, offset: 0 },
            { normal: { x: 0, y: 1 }, offset: -0.5 },
        ];
        const controls = controlPointsFromHalfPlanes(planes, 0.5);
        const roundtrip = halfPlanesFromControlPoints(controls);
        roundtrip.forEach((plane, idx) => {
            const expected = orientHalfPlaneTowardOrigin(planes[idx]);
            expect(plane.normal.x).toBeCloseTo(expected.normal.x, 12);
            expect(plane.normal.y).toBeCloseTo(expected.normal.y, 12);
            expect(plane.offset).toBeCloseTo(expected.offset, 12);
            expect(plane.offset).toBeGreaterThanOrEqual(0);
        });
    });

    it("hitTestControlPoints finds nearest control point within tolerance", () => {
        resetControlPointIdCounter();
        const plane: HalfPlane = { normal: { x: 1, y: 0 }, offset: 0 };
        const [points] = controlPointsFromHalfPlanes([plane], 0.5);
        const screenPoints = points.map((p) => worldToScreen(vp, p));
        const hit = hitTestControlPoints([points], vp, screenPoints[0], 6);
        expect(hit).toEqual({ planeIndex: 0, pointIndex: 0 });
        const miss = hitTestControlPoints([points], vp, { x: 100, y: 100 }, 6);
        expect(miss).toBeNull();
    });

    it("updateControlPoint updates all shared references to the same id", () => {
        resetControlPointIdCounter();
        const controls: HalfPlaneControlPoints[] = [
            [
                { id: "a", x: 0, y: 0, fixed: false },
                { id: "b", x: 0, y: 1, fixed: false },
            ],
            [
                { id: "a", x: 0, y: 0, fixed: false },
                { id: "c", x: 1, y: 1, fixed: false },
            ],
        ];
        const updated = updateControlPoint(controls, 0, 0, { x: 2, y: 2 });
        expect(updated[0][0]).toEqual({ id: "a", x: 2, y: 2, fixed: false });
        expect(updated[1][0]).toEqual({ id: "a", x: 2, y: 2, fixed: false });
        expect(updated[0][1]).toBe(controls[0][1]);
        expect(updated[1][1]).toBe(controls[1][1]);
    });

    it("updateControlPoint respects fixed control points", () => {
        resetControlPointIdCounter();
        const controls: HalfPlaneControlPoints[] = [
            [
                { id: "hinge", x: 0, y: 0, fixed: true },
                { id: "b", x: 0, y: 1, fixed: false },
            ],
        ];
        const updated = updateControlPoint(controls, 0, 0, { x: 5, y: 5 });
        expect(updated).toBe(controls);
    });

    it("controlPointsFromHalfPlanes applies assignments for shared ids", () => {
        resetControlPointIdCounter();
        const planes: HalfPlane[] = [
            { normal: { x: 1, y: 0 }, offset: 0 },
            { normal: { x: 0, y: 1 }, offset: 0 },
        ];
        const assignments: ControlPointAssignment[] = [
            { planeIndex: 0, pointIndex: 0, id: "hinge", fixed: true },
            { planeIndex: 1, pointIndex: 0, id: "hinge", fixed: true },
        ];
        const controls = controlPointsFromHalfPlanes(planes, 0.6, assignments);
        expect(controls[0][0].id).toBe("hinge");
        expect(controls[1][0].id).toBe("hinge");
        expect(controls[0][0].fixed).toBe(true);
        expect(controls[1][0].fixed).toBe(true);

        const table = controlPointTableFromControls(controls);
        expect(Object.keys(table)).toContain("hinge");
        expect(table.hinge.fixed).toBe(true);
    });
});
