import { describe, expect, it } from "vitest";
import type { Circle, Vec2 } from "@/geom/core/types";
import {
    type InvertedLineImage,
    invertInCircle,
    invertLineInCircle,
    invertUnit,
} from "@/geom/transforms/inversion";

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

    it("inverts a line not passing the center into a circle", () => {
        const circle: Circle = { c: { x: 0, y: 0 }, r: 1 };
        const result = invertLineInCircle(
            { start: { x: -2, y: 0.5 }, end: { x: 2, y: 0.5 } },
            circle,
        );
        if (result.kind !== "circle") {
            throw new Error("expected a circle result");
        }
        expect(result.center.x).toBeCloseTo(0, 12);
        expect(result.center.y).toBeCloseTo(1, 12);
        expect(result.radius).toBeCloseTo(1, 12);
    });

    it("keeps a line passing the center as a line", () => {
        const circle: Circle = { c: { x: 0, y: 0 }, r: 0.6 };
        const result: InvertedLineImage = invertLineInCircle(
            { start: { x: -1, y: 0 }, end: { x: 1, y: 0 } },
            circle,
        );
        if (result.kind !== "line") {
            throw new Error("expected a line result");
        }
        expect(result.normal.x).toBeCloseTo(0, 12);
        expect(Math.abs(result.normal.y)).toBeCloseTo(1, 12);
        expect(result.offset).toBeCloseTo(0, 12);
    });
});
