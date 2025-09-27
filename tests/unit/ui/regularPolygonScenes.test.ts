import { describe, expect, it } from "vitest";
import { halfPlanesFromControlPoints } from "@/ui/interactions/halfPlaneControlPoints";
import { createRegularPolygonSceneConfig } from "@/ui/scenes/regularPolygons";

function collectOccurrences(
    points: ReturnType<typeof createRegularPolygonSceneConfig>["initialControlPoints"],
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const pair of points) {
        for (const point of pair) {
            const next = (counts.get(point.id) ?? 0) + 1;
            counts.set(point.id, next);
        }
    }
    return counts;
}

describe("regular polygon scene config", () => {
    it("creates shared vertex control points for a square", () => {
        const config = createRegularPolygonSceneConfig({ sides: 4, radius: 0.7 });
        expect(config.halfPlanes).toHaveLength(4);
        expect(config.initialControlPoints).toHaveLength(4);
        expect(config.controlAssignments).toHaveLength(8);

        const reconstructed = halfPlanesFromControlPoints(config.initialControlPoints);
        reconstructed.forEach((plane, idx) => {
            expect(plane.normal.x).toBeCloseTo(config.halfPlanes[idx].normal.x, 12);
            expect(plane.normal.y).toBeCloseTo(config.halfPlanes[idx].normal.y, 12);
            expect(plane.offset).toBeCloseTo(config.halfPlanes[idx].offset, 12);
        });

        const counts = collectOccurrences(config.initialControlPoints);
        expect([...counts.values()].every((count) => count === 2)).toBe(true);

        config.controlAssignments.forEach((assignment) => {
            const control =
                config.initialControlPoints[assignment.planeIndex][assignment.pointIndex];
            expect(control.id).toBe(assignment.id);
        });
    });
});
