import { test, fc } from "@fast-check/vitest";
import {
    angleToBoundaryPoint,
    boundaryPointToAngle,
    normalizeOnUnitCircle,
    isOnUnitCircle,
} from "../../src/geom/unit-disk";
import { defaultTol, tolValue } from "../../src/geom/types";

const angleArb = fc.double({
    min: -10 * Math.PI,
    max: 10 * Math.PI,
    noNaN: true,
    noDefaultInfinity: true,
});

const vecArb = fc.record({
    x: fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
});

const posArb = fc.double({ min: 1e-9, max: 1e9, noNaN: true, noDefaultInfinity: true });

function norm(x: number, y: number): number {
    return Math.hypot(x, y);
}

function normalizeAngle(t: number): number {
    let a = t % (2 * Math.PI);
    if (a <= -Math.PI) a += 2 * Math.PI;
    if (a > Math.PI) a -= 2 * Math.PI;
    return a;
}

test.prop([angleArb])("angleToBoundaryPoint gives unit norm", (theta) => {
    const p = angleToBoundaryPoint(theta);
    expect(norm(p.x, p.y)).toBeCloseTo(1, 12);
});

test.prop([angleArb, fc.integer({ min: -3, max: 3 })])(
    "angleToBoundaryPoint periodicity",
    (theta, k) => {
        const p1 = angleToBoundaryPoint(theta);
        const p2 = angleToBoundaryPoint(theta + 2 * Math.PI * k);
        expect(p2.x).toBeCloseTo(p1.x, 12);
        expect(p2.y).toBeCloseTo(p1.y, 12);
    },
);

test.prop([angleArb])(
    "boundaryPointToAngle(angleToBoundaryPoint(theta)) = normalizeAngle(theta)",
    (theta) => {
        const a = boundaryPointToAngle(angleToBoundaryPoint(theta));
        expect(a).toBeCloseTo(normalizeAngle(theta), 12);
    },
);

test.prop([vecArb])(
    "angleToBoundaryPoint(boundaryPointToAngle(p)) = normalizeOnUnitCircle(p) (p≠0)",
    (p) => {
        const r = norm(p.x, p.y);
        fc.pre(r > 1e-9);
        const q = angleToBoundaryPoint(boundaryPointToAngle(p));
        const n = normalizeOnUnitCircle(p);
        expect(q.x).toBeCloseTo(n.x, 12);
        expect(q.y).toBeCloseTo(n.y, 12);
    },
);

test.prop([vecArb, posArb])("normalizeOnUnitCircle: scale invariance and idempotence", (p, s) => {
    const r = norm(p.x, p.y);
    fc.pre(r > 1e-9);
    const n1 = normalizeOnUnitCircle(p);
    const n2 = normalizeOnUnitCircle({ x: s * p.x, y: s * p.y });
    const n3 = normalizeOnUnitCircle(n1);
    expect(norm(n1.x, n1.y)).toBeCloseTo(1, 12);
    expect(n2.x).toBeCloseTo(n1.x, 12);
    expect(n2.y).toBeCloseTo(n1.y, 12);
    expect(n3.x).toBeCloseTo(n1.x, 12);
    expect(n3.y).toBeCloseTo(n1.y, 12);
});

test("isOnUnitCircle tolerance behavior", () => {
    const eps = tolValue(1, defaultTol);
    const inside = { x: 1 + eps * 0.5, y: 0 };
    const outside = { x: 1 + eps * 10, y: 0 };
    expect(isOnUnitCircle(angleToBoundaryPoint(0))).toBe(true);
    expect(isOnUnitCircle(inside)).toBe(true);
    expect(isOnUnitCircle(outside)).toBe(false);
});

