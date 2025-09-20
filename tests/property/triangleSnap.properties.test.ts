import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { snapParameterToPiOverN } from "../../src/geom/triangleSnap";

const DEFAULT_MAX = 200;

const valueArb = fc.double({ min: 0.01, max: 500, noDefaultInfinity: true, noNaN: true });
const nMaxArb = fc.integer({ min: 50, max: DEFAULT_MAX });

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
