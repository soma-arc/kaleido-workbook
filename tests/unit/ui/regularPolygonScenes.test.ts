import { describe, expect, it } from "vitest";
import { halfPlaneOffset, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import {
    type HalfPlaneControlPoints,
    orientHalfPlaneTowardOrigin,
} from "@/geom/primitives/halfPlaneControls";
import {
    halfPlanesFromControlPoints,
    updateControlPoint,
} from "@/ui/interactions/halfPlaneControlPoints";
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
            const expected = normalizeHalfPlane(config.halfPlanes[idx]);
            const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
            expect(unit.normal.x).toBeCloseTo(expected.normal.x, 12);
            expect(unit.normal.y).toBeCloseTo(expected.normal.y, 12);
            expect(halfPlaneOffset(unit)).toBeCloseTo(halfPlaneOffset(expected), 12);
        });

        const counts = collectOccurrences(config.initialControlPoints);
        expect([...counts.values()].every((count) => count === 2)).toBe(true);

        config.controlAssignments.forEach((assignment) => {
            const control =
                config.initialControlPoints[assignment.planeIndex][assignment.pointIndex];
            expect(control.id).toBe(assignment.id);
        });
    });

    it("maintains clockwise and counterclockwise adjacency for a pentagon", () => {
        const sides = 5;
        const config = createRegularPolygonSceneConfig({ sides, radius: 0.7 });
        expect(config.halfPlanes).toHaveLength(sides);
        expect(config.initialControlPoints).toHaveLength(sides);
        expect(config.controlAssignments).toHaveLength(sides * 2);

        const reconstructed = halfPlanesFromControlPoints(config.initialControlPoints);
        reconstructed.forEach((plane, idx) => {
            const original = normalizeHalfPlane(config.halfPlanes[idx]);
            const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
            expect(unit.normal.x).toBeCloseTo(original.normal.x, 12);
            expect(unit.normal.y).toBeCloseTo(original.normal.y, 12);
            expect(halfPlaneOffset(unit)).toBeCloseTo(halfPlaneOffset(original), 12);
        });

        const counts = collectOccurrences(config.initialControlPoints);
        counts.forEach((occurrences, key) => {
            expect(occurrences).toBe(2);
            const [_, rawIndex] = key.split("-");
            const vertexIndex = Number.parseInt(rawIndex ?? "", 10);
            expect(Number.isNaN(vertexIndex)).toBe(false);

            const associated = config.controlAssignments.filter(
                (assignment) => assignment.id === key,
            );
            expect(associated).toHaveLength(2);
            const planeIndices = associated.map((assignment) => assignment.planeIndex);
            const sorted = [...planeIndices].sort((a, b) => a - b);
            const expectedPrev = (vertexIndex - 1 + sides) % sides;
            const expectedNext = vertexIndex % sides;
            expect(sorted).toEqual([expectedPrev, expectedNext].sort((a, b) => a - b));

            const current = associated.find((assignment) => assignment.planeIndex === expectedNext);
            const previous = associated.find(
                (assignment) => assignment.planeIndex === expectedPrev,
            );
            expect(current?.pointIndex).toBe(0);
            expect(previous?.pointIndex).toBe(1);

            const points = config.initialControlPoints[expectedNext];
            expect(points[0].id).toBe(key);
            const nextIndex = (vertexIndex + 1) % sides;
            expect(points[1].id).toBe(`vertex-${nextIndex}`);
        });
    });

    it("only updates adjacent half-planes when dragging a pentagon vertex", () => {
        const sides = 5;
        const config = createRegularPolygonSceneConfig({ sides, radius: 0.7 });
        const controls: HalfPlaneControlPoints[] = config.initialControlPoints.map(
            ([a, b]) => [{ ...a }, { ...b }] as HalfPlaneControlPoints,
        );
        const originalPlanes = halfPlanesFromControlPoints(controls);

        const targetAssignment = config.controlAssignments.find(
            (assignment) => assignment.id === "vertex-0" && assignment.pointIndex === 0,
        );
        if (!targetAssignment) {
            throw new Error("Expected assignment for vertex-0");
        }
        const companionAssignment = config.controlAssignments.find(
            (assignment) => assignment.id === "vertex-0" && assignment !== targetAssignment,
        );
        if (!companionAssignment) {
            throw new Error("Expected companion assignment for vertex-0");
        }

        const originalPoint = controls[targetAssignment.planeIndex][targetAssignment.pointIndex];
        const movedPoint = {
            x: originalPoint.x + 0.1,
            y: originalPoint.y - 0.05,
        };
        const updatedControls = updateControlPoint(
            controls,
            targetAssignment.planeIndex,
            targetAssignment.pointIndex,
            movedPoint,
        );
        const updatedPlanes = halfPlanesFromControlPoints(updatedControls);

        const affected = new Set([targetAssignment.planeIndex, companionAssignment.planeIndex]);
        updatedPlanes.forEach((plane, idx) => {
            const baseline = originalPlanes[idx];
            if (affected.has(idx)) {
                const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
                const ref = normalizeHalfPlane(orientHalfPlaneTowardOrigin(baseline));
                const delta = Math.max(
                    Math.abs(unit.normal.x - ref.normal.x),
                    Math.abs(unit.normal.y - ref.normal.y),
                    Math.abs(halfPlaneOffset(unit) - halfPlaneOffset(ref)),
                );
                expect(delta).toBeGreaterThan(1e-6);
            } else {
                const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
                const ref = normalizeHalfPlane(orientHalfPlaneTowardOrigin(baseline));
                expect(unit.normal.x).toBeCloseTo(ref.normal.x, 12);
                expect(unit.normal.y).toBeCloseTo(ref.normal.y, 12);
                expect(halfPlaneOffset(unit)).toBeCloseTo(halfPlaneOffset(ref), 12);
            }
        });
    });

    it("preserves adjacency while sequentially dragging hexagon vertices", () => {
        const sides = 6;
        const config = createRegularPolygonSceneConfig({ sides, radius: 0.7 });
        let controls: HalfPlaneControlPoints[] = config.initialControlPoints.map(
            ([a, b]) => [{ ...a }, { ...b }] as HalfPlaneControlPoints,
        );
        let baselinePlanes = halfPlanesFromControlPoints(controls);

        for (let vertexIndex = 0; vertexIndex < sides; vertexIndex++) {
            const vertexId = `vertex-${vertexIndex}`;
            const assignments = config.controlAssignments.filter(
                (assignment) => assignment.id === vertexId,
            );
            expect(assignments).toHaveLength(2);

            const primary = assignments.find(
                (assignment) =>
                    assignment.planeIndex === vertexIndex && assignment.pointIndex === 0,
            );
            const companion = assignments.find((assignment) => assignment !== primary);
            expect(primary).toBeTruthy();
            expect(companion).toBeTruthy();
            if (!primary || !companion) {
                continue;
            }

            const originalPoint = controls[primary.planeIndex][primary.pointIndex];
            const movedPoint = {
                x: originalPoint.x + 0.08 * Math.cos(vertexIndex),
                y: originalPoint.y + 0.06 * Math.sin(vertexIndex),
            };

            const movedControls = updateControlPoint(
                controls,
                primary.planeIndex,
                primary.pointIndex,
                movedPoint,
            );
            const movedPlanes = halfPlanesFromControlPoints(movedControls);
            const affected = new Set([primary.planeIndex, companion.planeIndex]);
            movedPlanes.forEach((plane, idx) => {
                const reference = baselinePlanes[idx];
                if (affected.has(idx)) {
                    const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
                    const ref = normalizeHalfPlane(orientHalfPlaneTowardOrigin(reference));
                    const delta = Math.max(
                        Math.abs(unit.normal.x - ref.normal.x),
                        Math.abs(unit.normal.y - ref.normal.y),
                        Math.abs(halfPlaneOffset(unit) - halfPlaneOffset(ref)),
                    );
                    expect(delta).toBeGreaterThan(1e-6);
                } else {
                    const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
                    const ref = normalizeHalfPlane(orientHalfPlaneTowardOrigin(reference));
                    expect(unit.normal.x).toBeCloseTo(ref.normal.x, 12);
                    expect(unit.normal.y).toBeCloseTo(ref.normal.y, 12);
                    expect(halfPlaneOffset(unit)).toBeCloseTo(halfPlaneOffset(ref), 12);
                }
            });

            const revertedControls = updateControlPoint(
                movedControls,
                primary.planeIndex,
                primary.pointIndex,
                { x: originalPoint.x, y: originalPoint.y },
            );
            const revertedPlanes = halfPlanesFromControlPoints(revertedControls);
            revertedPlanes.forEach((plane, idx) => {
                const reference = baselinePlanes[idx];
                const unit = normalizeHalfPlane(orientHalfPlaneTowardOrigin(plane));
                const ref = normalizeHalfPlane(orientHalfPlaneTowardOrigin(reference));
                expect(unit.normal.x).toBeCloseTo(ref.normal.x, 12);
                expect(unit.normal.y).toBeCloseTo(ref.normal.y, 12);
                expect(halfPlaneOffset(unit)).toBeCloseTo(halfPlaneOffset(ref), 12);
            });

            controls = revertedControls;
            baselinePlanes = revertedPlanes;
        }
    });
});
