import { describe, expect, it } from "vitest";
import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { evaluateHalfPlane, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import {
    deriveHalfPlaneFromPoints,
    derivePointsFromHalfPlane,
    type HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";

function length(v: Vec2): number {
    return Math.hypot(v.x, v.y);
}

describe("halfPlaneControls", () => {
    it("derives a unit half-plane from two points", () => {
        const points: HalfPlaneControlPoints = [
            { id: "p0", x: 0, y: 0, fixed: false },
            { id: "p1", x: 0, y: 1, fixed: false },
        ];
        const plane = deriveHalfPlaneFromPoints([
            { x: points[0].x, y: points[0].y },
            { x: points[1].x, y: points[1].y },
        ]);
        expect(length(plane.normal)).toBeCloseTo(1, 12);
        expect(plane.anchor.x).toBeCloseTo(points[0].x, 12);
        expect(plane.anchor.y).toBeCloseTo(points[0].y, 12);
        expect(plane.normal.x).toBeCloseTo(1, 12);
        expect(plane.normal.y).toBeCloseTo(0, 12);
    });

    it("derives control points from a half-plane with spacing", () => {
        const plane: HalfPlane = { anchor: { x: 0.5, y: 0 }, normal: { x: -1, y: 0 } };
        const points = derivePointsFromHalfPlane(plane, 0.25);
        for (const p of points) {
            const value = evaluateHalfPlane(plane, p);
            expect(value).toBeCloseTo(0, 12);
        }
        expect(
            length({
                x: points[1].x - points[0].x,
                y: points[1].y - points[0].y,
            }),
        ).toBeCloseTo(0.25, 12);
    });

    it("round-trips between plane and points", () => {
        const plane: HalfPlane = {
            anchor: { x: 0.5, y: -1.2 },
            normal: { x: 0.6, y: -0.8 },
        };
        const normalized = normalizeHalfPlane(plane);
        const points = derivePointsFromHalfPlane(normalized, 0.4);
        const back = deriveHalfPlaneFromPoints(points);
        expect(back.anchor.x).toBeCloseTo(normalized.anchor.x, 12);
        expect(back.anchor.y).toBeCloseTo(normalized.anchor.y, 12);
        expect(back.normal.x).toBeCloseTo(normalized.normal.x, 12);
        expect(back.normal.y).toBeCloseTo(normalized.normal.y, 12);
    });
});
