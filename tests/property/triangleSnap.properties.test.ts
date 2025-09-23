import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { validateTriangleParams } from "@/geom/triangle/params";
import {
    DEFAULT_PI_OVER_N_MAX,
    snapParameterToPiOverN,
    snapTriangleParams,
} from "@/geom/triangle/snap";

const DEFAULT_MAX = DEFAULT_PI_OVER_N_MAX;

const valueArb = fc.double({ min: 0.01, max: 500, noDefaultInfinity: true, noNaN: true });
const nMaxArb = fc.integer({ min: 50, max: DEFAULT_MAX });
const hyperbolicAnchorArb = fc
    .tuple(fc.integer({ min: 2, max: 20 }), fc.integer({ min: 2, max: 20 }))
    .filter(([p, q]) => 1 / p + 1 / q < 1 - 1e-6);

const angleDiff = (n: number, value: number) => Math.abs(Math.PI / n - Math.PI / value);

test.prop([valueArb])("idempotent on canonical denominators", (n) => {
    const rounded = Math.max(2, Math.min(DEFAULT_MAX, Math.round(n)));
    expect(snapParameterToPiOverN(rounded)).toBe(rounded);
});

test.prop([valueArb, nMaxArb])("returns n minimizing |π/n - π/value|", (value, nMax) => {
    const snapped = snapParameterToPiOverN(value, { nMax });
    expect(snapped).toBeGreaterThanOrEqual(2);
    expect(snapped).toBeLessThanOrEqual(nMax);

    const diff = angleDiff(snapped, value);
    let best = Number.POSITIVE_INFINITY;
    for (let n = 2; n <= nMax; n += 1) {
        const candidate = angleDiff(n, value);
        if (candidate < best) {
            best = candidate;
        }
    }
    expect(diff).toBeCloseTo(best, 12);
});

test.prop([hyperbolicAnchorArb, valueArb])(
    "locked (p,q) triples are hyperbolic when feasible",
    ([p, q], r) => {
        const result = snapTriangleParams(
            { p, q, r },
            { locked: { p: true, q: true }, nMax: DEFAULT_MAX },
        );
        expect(validateTriangleParams(result).ok).toBe(true);
    },
);
