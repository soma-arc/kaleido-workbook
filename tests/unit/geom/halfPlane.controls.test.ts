import { describe, expect, it } from "vitest";
import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
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
            { x: 0, y: 0 },
            { x: 0, y: 1 },
        ];
        const plane = deriveHalfPlaneFromPoints(points);
        expect(length(plane.normal)).toBeCloseTo(1, 12);
        expect(plane.normal.x).toBeCloseTo(1, 12);
        expect(plane.normal.y).toBeCloseTo(0, 12);
        expect(plane.offset).toBeCloseTo(0, 12);
    });

    it("derives control points from a half-plane with spacing", () => {
        const plane: HalfPlane = { normal: { x: -1, y: 0 }, offset: 0.5 };
        const points = derivePointsFromHalfPlane(plane, 0.25);
        for (const p of points) {
            const value = plane.normal.x * p.x + plane.normal.y * p.y + plane.offset;
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
        const plane: HalfPlane = { normal: { x: 0.6, y: -0.8 }, offset: 1.5 };
        const normalized: HalfPlane = {
            normal: {
                x: plane.normal.x / length(plane.normal),
                y: plane.normal.y / length(plane.normal),
            },
            offset: plane.offset / length(plane.normal),
        };
        const points = derivePointsFromHalfPlane(normalized, 0.4);
        const back = deriveHalfPlaneFromPoints(points);
        expect(back.normal.x).toBeCloseTo(normalized.normal.x, 12);
        expect(back.normal.y).toBeCloseTo(normalized.normal.y, 12);
        expect(back.offset).toBeCloseTo(normalized.offset, 12);
    });
});
