import { describe, expect, it } from "vitest";
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

    it("falls back to Euclidean construction when 1/p+1/q+1/r ≈ 1", () => {
        const tri = buildHyperbolicTriangle(3, 3, 3);
        expect(tri.boundaries).toHaveLength(3);
        const interior = {
            x: (tri.vertices[0].x + tri.vertices[1].x + tri.vertices[2].x) / 3,
            y: (tri.vertices[0].y + tri.vertices[1].y + tri.vertices[2].y) / 3,
        };

        tri.boundaries.forEach((boundary) => {
            if (boundary.kind !== "line") throw new Error("expected line");
            const hp = normalizeHalfPlane({ anchor: boundary.anchor, normal: boundary.normal });
            expect(evaluateHalfPlane(hp, interior)).toBeGreaterThan(0);
        });
    });

    it("throws when 1/p+1/q+1/r > 1", () => {
        expect(() => buildHyperbolicTriangle(2.1, 2.1, 2.1)).toThrowError(/hyperbolic constraint/);
    });
});
