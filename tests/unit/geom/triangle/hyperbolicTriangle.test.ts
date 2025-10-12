import { describe, expect, it, vi } from "vitest";
import { angleBetweenGeodesicsAt } from "@/geom/triangle/geodesicAngles";
import { buildHyperbolicTriangle } from "@/geom/triangle/hyperbolicTriangle";

// keep for potential future table-driven tests (unused)
// const _toRad = (x: number) => (x * Math.PI) / 180;

describe("geom/triangle/hyperbolicTriangle", () => {
    it("builds a (2,3,7) triangle with expected angles (within tol)", () => {
        const tri = buildHyperbolicTriangle(2, 3, 7);
        const [g1, g2, g3] = tri.mirrors;

        const alpha = Math.PI / 2;
        const beta = Math.PI / 3;
        const gamma = Math.PI / 7;
        const tol = 1e-6;

        // vertex0 at origin is intersection of g1 and g2 by construction
        const a = angleBetweenGeodesicsAt(g1, g2, { x: 0, y: 0 });
        expect(a).toBeGreaterThan(0);
        expect(Math.abs(a - alpha)).toBeLessThan(tol);

        // other two vertices are computed by helper based on intersections
        const b = angleBetweenGeodesicsAt(g1, g3);
        const c = angleBetweenGeodesicsAt(g2, g3);
        expect(Math.abs(b - beta)).toBeLessThan(5e-3); // numeric solve tolerance
        expect(Math.abs(c - gamma)).toBeLessThan(5e-3);
    });

    it("warns but returns mirrors for (3,3,3)", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tri = buildHyperbolicTriangle(3, 3, 3);
        expect(tri.mirrors).toHaveLength(3);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0]?.[0]).toContain("(p,q,r)=(3,3,3)");
        warnSpy.mockRestore();
    });
});
