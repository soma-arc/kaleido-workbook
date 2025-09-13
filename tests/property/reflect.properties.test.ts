import { fc, test } from "@fast-check/vitest";
import { geodesicFromBoundary } from "../../src/geom/geodesic";
import { reflectAcrossGeodesic } from "../../src/geom/reflect";
import { angleToBoundaryPoint, isOnUnitCircle } from "../../src/geom/unit-disk";

const angleArb = fc.double({ min: -Math.PI, max: Math.PI, noNaN: true, noDefaultInfinity: true });

const pointInDiskArb = fc.record({
    x: fc.double({ min: -0.95, max: 0.95, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: -0.95, max: 0.95, noNaN: true, noDefaultInfinity: true }),
});

test.prop([angleArb, pointInDiskArb])(
    "diameter reflection is an involution and boundary-preserving",
    (theta, p) => {
        const a = angleToBoundaryPoint(theta);
        const b = angleToBoundaryPoint(theta + Math.PI);
        const g = geodesicFromBoundary(a, b);
        const R = reflectAcrossGeodesic(g);
        // involution
        const back = R(R(p));
        expect(back.x).toBeCloseTo(p.x, 12);
        expect(back.y).toBeCloseTo(p.y, 12);
        // boundary maps to boundary
        const q = angleToBoundaryPoint(theta + 0.123);
        const rq = R(q);
        expect(isOnUnitCircle(rq)).toBe(true);
    },
);

test.prop([angleArb, angleArb, pointInDiskArb])(
    "circle reflection (inversion) is an involution and boundary-preserving",
    (t1, t2, p) => {
        // avoid near-equal/near-opposite to keep geodesic well-conditioned
        const s = Math.abs(Math.sin(0.5 * (t2 - t1)));
        fc.pre(s > 1e-4 && s < 1 - 1e-6);
        const a = angleToBoundaryPoint(t1);
        const b = angleToBoundaryPoint(t2);
        const g = geodesicFromBoundary(a, b);
        fc.pre(g.kind === "circle");
        const R = reflectAcrossGeodesic(g);
        const back = R(R(p));
        // near-singular configurations amplify rounding; allow ~1e-7 here
        expect(back.x).toBeCloseTo(p.x, 7);
        expect(back.y).toBeCloseTo(p.y, 7);
        // choose a boundary point far from the geodesic endpoints to avoid ill-conditioning
        const q = angleToBoundaryPoint(t1 + Math.PI * 0.73);
        const rq = R(q);
        expect(isOnUnitCircle(rq)).toBe(true);
    },
);
