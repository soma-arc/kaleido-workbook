import { test, fc } from "@fast-check/vitest";
import { invertUnit, invertInCircle } from "../../src/geom/inversion";
import type { Circle, Vec } from "../../src/geom/types";

const vecArb = fc.record({
    x: fc.double({ min: -10, max: 10, noDefaultInfinity: true, noNaN: true }),
    y: fc.double({ min: -10, max: 10, noDefaultInfinity: true, noNaN: true }),
});

const circleArb: fc.Arbitrary<Circle> = fc.record({
    c: vecArb,
    r: fc.double({ min: 0.1, max: 5, noDefaultInfinity: true, noNaN: true }),
});

function close(a: number, b: number, tol = 1e-10): boolean {
    return Math.abs(a - b) <= tol;
}

test.prop([vecArb])("invertUnit is an involution (except near origin)", (p) => {
    const r2 = p.x * p.x + p.y * p.y;
    fc.pre(r2 > 1e-9);
    const q = invertUnit(p);
    const back = invertUnit(q);
    return close(back.x, p.x) && close(back.y, p.y);
});

test.prop([circleArb, vecArb])(
    "invertInCircle is an involution (except near center)",
    (C, p) => {
        const dx = p.x - C.c.x;
        const dy = p.y - C.c.y;
        const d2 = dx * dx + dy * dy;
        fc.pre(d2 > 1e-9);
        const q = invertInCircle(p, C);
        const back = invertInCircle(q, C);
        return close(back.x, p.x) && close(back.y, p.y);
    },
);
