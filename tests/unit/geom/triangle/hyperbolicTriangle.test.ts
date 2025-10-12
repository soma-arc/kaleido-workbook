import { describe, expect, it, vi } from "vitest";
import { evaluateHalfPlane, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import { orientedGeodesicToGeodesic } from "@/geom/primitives/orientedGeodesic";
import { angleBetweenGeodesicsAt } from "@/geom/triangle/geodesicAngles";
import { buildHyperbolicTriangle } from "@/geom/triangle/hyperbolicTriangle";

describe("geom/triangle/hyperbolicTriangle", () => {
    it("builds a (2,3,7) triangle with expected angles (within tol)", () => {
        const tri = buildHyperbolicTriangle(2, 3, 7);
        const [b1, b2, b3] = tri.boundaries;

        const g1 = orientedGeodesicToGeodesic(b1);
        const g2 = orientedGeodesicToGeodesic(b2);
        const g3 = orientedGeodesicToGeodesic(b3);

        const alpha = Math.PI / 2;
        const beta = Math.PI / 3;
        const gamma = Math.PI / 7;
        const tol = 1e-6;

        const a = angleBetweenGeodesicsAt(g1, g2, { x: 0, y: 0 });
        expect(a).toBeGreaterThan(0);
        expect(Math.abs(a - alpha)).toBeLessThan(tol);

        const b = angleBetweenGeodesicsAt(g1, g3);
        const c = angleBetweenGeodesicsAt(g2, g3);
        expect(Math.abs(b - beta)).toBeLessThan(5e-3);
        expect(Math.abs(c - gamma)).toBeLessThan(5e-3);
    });

    it("warns but returns oriented boundaries for (3,3,3)", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tri = buildHyperbolicTriangle(3, 3, 3);
        expect(tri.boundaries).toHaveLength(3);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0]?.[0]).toContain("(p,q,r)=(3,3,3)");

        const [line1, line2, circle] = tri.boundaries;
        expect(line1.kind).toBe("line");
        expect(line2.kind).toBe("line");
        expect(circle.kind).toBe("circle");

        if (line1.kind !== "line" || line2.kind !== "line" || circle.kind !== "circle") {
            throw new Error("Unexpected boundary configuration");
        }

        const interior = {
            x: (tri.vertices[0].x + tri.vertices[1].x + tri.vertices[2].x) / 3,
            y: (tri.vertices[0].y + tri.vertices[1].y + tri.vertices[2].y) / 3,
        };

        const hp0 = normalizeHalfPlane({ anchor: line1.anchor, normal: line1.normal });
        const hp1 = normalizeHalfPlane({ anchor: line2.anchor, normal: line2.normal });
        expect(evaluateHalfPlane(hp0, interior)).toBeLessThan(0);
        expect(evaluateHalfPlane(hp1, interior)).toBeLessThan(0);
        const cross = line1.normal.x * line2.normal.y - line1.normal.y * line2.normal.x;
        expect(cross).toBeLessThan(0);

        const distance = Math.hypot(interior.x - circle.center.x, interior.y - circle.center.y);
        expect(circle.orientation * (distance - circle.radius)).toBeLessThanOrEqual(0);

        warnSpy.mockRestore();
    });
});
