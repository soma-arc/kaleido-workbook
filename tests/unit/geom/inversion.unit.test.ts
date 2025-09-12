import { describe, it, expect } from "vitest";
import { invertUnit, invertInCircle } from "../../../src/geom/inversion";
import type { Circle, Vec2 } from "../../../src/geom/types";

const close = (a: number, b: number, d = 1e-12) => Math.abs(a - b) <= d;

describe("inversion (unit tests)", () => {
    it("unit inversion: fixed on unit circle", () => {
        const th = Math.PI / 6;
        const p: Vec2 = { x: Math.cos(th), y: Math.sin(th) };
        const q = invertUnit(p);
        expect(close(q.x, p.x)).toBe(true);
        expect(close(q.y, p.y)).toBe(true);
    });

    it("unit inversion: (2,0) -> (0.5,0)", () => {
        const p: Vec2 = { x: 2, y: 0 };
        const q = invertUnit(p);
        expect(q.x).toBeCloseTo(0.5, 12);
        expect(q.y).toBeCloseTo(0, 12);
    });

    it("general circle inversion: fixed on circle", () => {
        const C: Circle = { c: { x: 1, y: -2 }, r: 3 };
        const th = 0.73;
        const p: Vec2 = { x: C.c.x + C.r * Math.cos(th), y: C.c.y + C.r * Math.sin(th) };
        const q = invertInCircle(p, C);
        expect(q.x).toBeCloseTo(p.x, 12);
        expect(q.y).toBeCloseTo(p.y, 12);
    });
});
