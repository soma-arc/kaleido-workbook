import { test, fc } from "@fast-check/vitest";
import { snapAngle, snapBoundaryPoint } from "../../src/geom/snap";
import { angleToBoundaryPoint } from "../../src/geom/unit-disk";

const TAU = 2 * Math.PI;

const angleArb = fc.double({
    min: -10 * Math.PI,
    max: 10 * Math.PI,
    noNaN: true,
    noDefaultInfinity: true,
});
const nArb = fc.integer({ min: 1, max: 64 });

test.prop([angleArb, nArb])("periodicity: snapAngle(theta+2πk)=snapAngle(theta)", (theta, N) => {
    const k = fc.sample(fc.integer({ min: -3, max: 3 }), 1)[0] as number;
    const a = snapAngle(theta, N);
    const b = snapAngle(theta + k * TAU, N);
    expect(b).toBeCloseTo(a, 12);
});

test.prop([angleArb, nArb])(
    "idempotent: snapAngle(snapAngle(theta)) = snapAngle(theta)",
    (theta, N) => {
        const a = snapAngle(theta, N);
        const b = snapAngle(a, N);
        expect(b).toBeCloseTo(a, 12);
    },
);

test.prop([angleArb, nArb])("grid membership: result is a multiple of step", (theta, N) => {
    const step = TAU / N;
    const a = snapAngle(theta, N);
    // bring to [0,2π)
    let t = a % TAU;
    if (t < 0) t += TAU;
    const k = Math.round(t / step);
    expect(t).toBeCloseTo(k * step, 12);
});

test.prop([angleArb, nArb])("snapBoundaryPoint corresponds to snapping angle", (theta, N) => {
    const p = angleToBoundaryPoint(theta);
    const q = snapBoundaryPoint(p, N);
    const expected = angleToBoundaryPoint(snapAngle(theta, N));
    expect(q.x).toBeCloseTo(expected.x, 12);
    expect(q.y).toBeCloseTo(expected.y, 12);
});
