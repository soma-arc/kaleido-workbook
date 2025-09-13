import { describe, it, expect } from "vitest";
import {
    angleToBoundaryPoint,
    boundaryPointToAngle,
    isOnUnitCircle,
    normalizeOnUnitCircle,
} from "../../../src/geom/unit-disk";

const close = (a: number, b: number, d = 1e-12) => Math.abs(a - b) <= d;

describe("unit-disk utilities (unit)", () => {
    it("angleToBoundaryPoint: canonical angles", () => {
        const p0 = angleToBoundaryPoint(0);
        expect(close(p0.x, 1)).toBe(true);
        expect(close(p0.y, 0)).toBe(true);

        const p90 = angleToBoundaryPoint(Math.PI / 2);
        expect(close(p90.x, 0)).toBe(true);
        expect(close(p90.y, 1)).toBe(true);

        const p180 = angleToBoundaryPoint(Math.PI);
        expect(close(p180.x, -1)).toBe(true);
        expect(close(p180.y, 0)).toBe(true);

        const p_90 = angleToBoundaryPoint(-Math.PI / 2);
        expect(close(p_90.x, 0)).toBe(true);
        expect(close(p_90.y, -1)).toBe(true);
    });

    it("boundaryPointToAngle: round-trip angle -> point -> angle (normalized)", () => {
        const th = 1.2345;
        const p = angleToBoundaryPoint(th);
        const th2 = boundaryPointToAngle(p);
        // Normalize to principal range before compare
        const norm = (t: number) => {
            let x = t % (2 * Math.PI);
            if (x <= -Math.PI) x += 2 * Math.PI;
            if (x > Math.PI) x -= 2 * Math.PI;
            return x;
        };
        expect(close(norm(th2), norm(th))).toBe(true);
    });

    it("isOnUnitCircle tolerates 1±1e-12", () => {
        const p1 = { x: 1 + 1e-12, y: 0 };
        const p2 = { x: 1 - 1e-12, y: 0 };
        expect(isOnUnitCircle(p1)).toBe(true);
        expect(isOnUnitCircle(p2)).toBe(true);
    });

    it("normalizeOnUnitCircle rescales arbitrary radius", () => {
        const q = { x: 2 * Math.SQRT1_2, y: 2 * Math.SQRT1_2 }; // radius=2
        const u = normalizeOnUnitCircle(q);
        expect(close(Math.hypot(u.x, u.y), 1)).toBe(true);
    });
});
