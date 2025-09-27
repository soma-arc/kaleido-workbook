import { fc, test } from "@fast-check/vitest";
import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import {
    deriveHalfPlaneFromPoints,
    derivePointsFromHalfPlane,
} from "@/geom/primitives/halfPlaneControls";

const pointArb = fc.record({
    x: fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
});

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

test.prop([fc.tuple(pointArb, pointArb).filter(([a, b]) => distance(a, b) > 1e-6)])(
    "points -> half-plane keeps unit normal and contains both points",
    ([a, b]) => {
        const plane = deriveHalfPlaneFromPoints([a, b]);
        const len = Math.hypot(plane.normal.x, plane.normal.y);
        expect(len).toBeCloseTo(1, 12);
        const evalA = plane.normal.x * a.x + plane.normal.y * a.y + plane.offset;
        const evalB = plane.normal.x * b.x + plane.normal.y * b.y + plane.offset;
        expect(evalA).toBeCloseTo(0, 12);
        expect(evalB).toBeCloseTo(0, 12);
    },
);

const halfPlaneArb = fc.record({
    normal: fc
        .tuple(
            fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
        )
        .filter(([x, y]) => Math.hypot(x, y) > 1e-6)
        .map(([x, y]) => {
            const len = Math.hypot(x, y);
            return { x: x / len, y: y / len } as Vec2;
        }),
    offset: fc.double({ min: -2, max: 2, noNaN: true, noDefaultInfinity: true }),
});

const spacingArb = fc.double({ min: 0.05, max: 2, noNaN: true, noDefaultInfinity: true });

test.prop([halfPlaneArb, spacingArb])(
    "half-plane -> points -> half-plane is stable",
    (plane, spacing) => {
        const normalized: HalfPlane = { normal: plane.normal, offset: plane.offset };
        const points = derivePointsFromHalfPlane(normalized, spacing);
        expect(distance(points[0], points[1])).toBeCloseTo(spacing, 12);
        for (const p of points) {
            const evalP = plane.normal.x * p.x + plane.normal.y * p.y + plane.offset;
            expect(evalP).toBeCloseTo(0, 12);
        }
        const back = deriveHalfPlaneFromPoints(points);
        expect(back.normal.x).toBeCloseTo(normalized.normal.x, 12);
        expect(back.normal.y).toBeCloseTo(normalized.normal.y, 12);
        expect(back.offset).toBeCloseTo(normalized.offset, 12);
    },
);
