import { describe, expect, it } from "vitest";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
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
        const planes: HalfPlane[] = [
            { normal: { x: 1, y: 0 }, offset: 0 },
            { normal: { x: 0, y: 1 }, offset: -0.5 },
        ];
        const controls = controlPointsFromHalfPlanes(planes, 0.5);
        const roundtrip = halfPlanesFromControlPoints(controls);
        roundtrip.forEach((plane, idx) => {
            expect(plane.normal.x).toBeCloseTo(planes[idx].normal.x, 12);
            expect(plane.normal.y).toBeCloseTo(planes[idx].normal.y, 12);
            expect(plane.offset).toBeCloseTo(planes[idx].offset, 12);
        });
    });

    it("hitTestControlPoints finds nearest control point within tolerance", () => {
        const plane: HalfPlane = { normal: { x: 1, y: 0 }, offset: 0 };
        const [points] = controlPointsFromHalfPlanes([plane], 0.5);
        const screenPoints = points.map((p) => worldToScreen(vp, p));
        const hit = hitTestControlPoints([points], vp, screenPoints[0], 6);
        expect(hit).toEqual({ planeIndex: 0, pointIndex: 0 });
        const miss = hitTestControlPoints([points], vp, { x: 100, y: 100 }, 6);
        expect(miss).toBeNull();
    });

    it("updateControlPoint replaces the targeted control point only", () => {
        const controls: HalfPlaneControlPoints[] = [
            [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
            ],
            [
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ],
        ];
        const updated = updateControlPoint(controls, 1, 0, { x: 2, y: 2 });
        expect(updated[1][0]).toEqual({ x: 2, y: 2 });
        expect(updated[0]).toEqual(controls[0]);
        expect(updated[1][1]).toEqual(controls[1][1]);
    });
});
