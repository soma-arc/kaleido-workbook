import { describe, expect, it } from "vitest";
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

    it("stays hyperbolic and approximates Euclidean angles near the boundary", () => {
        const tri = buildHyperbolicTriangle(3, 3, 3);
        expect(tri.boundaries).toHaveLength(3);
        const circleEdges = tri.boundaries.filter((boundary) => boundary.kind === "circle");
        expect(circleEdges.length).toBeGreaterThan(0);

        const expected = Math.PI / 3;
        tri.angles.forEach((angle) => {
            expect(Math.abs(angle - expected)).toBeLessThan(1e-3);
        });
    });

    it("throws when 1/p+1/q+1/r > 1", () => {
        expect(() => buildHyperbolicTriangle(2.1, 2.1, 2.1)).toThrowError();
    });
});
