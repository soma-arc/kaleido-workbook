import { fc, test } from "@fast-check/vitest";
import {
    evaluateHalfPlane,
    halfPlaneFromNormalAndOffset,
    normalizeHalfPlane,
    reflectAcrossHalfPlane,
} from "@/geom/primitives/halfPlane";

const normalArb = fc
    .record({
        x: fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
        y: fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }),
    })
    .filter((n) => Math.hypot(n.x, n.y) > 1e-6);

const offsetArb = fc.double({ min: -2, max: 2, noNaN: true, noDefaultInfinity: true });

const pointArb = fc.record({
    x: fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
});

function normalize(n: { x: number; y: number }): { x: number; y: number } {
    const len = Math.hypot(n.x, n.y) || 1;
    return { x: n.x / len, y: n.y / len };
}

test.prop([normalArb, offsetArb, pointArb])(
    "reflection across a half-plane is an involution",
    (n, offset, point) => {
        const plane = halfPlaneFromNormalAndOffset(normalize(n), offset);
        const reflect = reflectAcrossHalfPlane(plane);
        const once = reflect(point);
        const twice = reflect(once);
        expect(twice.x).toBeCloseTo(point.x, 12);
        expect(twice.y).toBeCloseTo(point.y, 12);
    },
);

test.prop([normalArb, offsetArb, pointArb])(
    "reflection preserves absolute distance to the boundary line",
    (n, offset, point) => {
        const plane = halfPlaneFromNormalAndOffset(normalize(n), offset);
        const reflect = reflectAcrossHalfPlane(plane);
        const valueBefore = evaluateHalfPlane(plane, point);
        const reflected = reflect(point);
        const valueAfter = evaluateHalfPlane(plane, reflected);
        expect(Math.abs(valueAfter)).toBeCloseTo(Math.abs(valueBefore), 12);
    },
);

test.prop([normalArb, offsetArb, pointArb])(
    "flipping the normal sign does not change the reflection",
    (n, offset, point) => {
        const plane = halfPlaneFromNormalAndOffset(normalize(n), offset);
        const flipped = normalizeHalfPlane({
            anchor: { x: plane.anchor.x, y: plane.anchor.y },
            normal: { x: -plane.normal.x, y: -plane.normal.y },
        });
        const reflectA = reflectAcrossHalfPlane(plane);
        const reflectB = reflectAcrossHalfPlane(flipped);
        const ra = reflectA(point);
        const rb = reflectB(point);
        expect(ra.x).toBeCloseTo(rb.x, 12);
        expect(ra.y).toBeCloseTo(rb.y, 12);
    },
);
