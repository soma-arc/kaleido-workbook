import { describe, expect, it } from "vitest";
import {
    buildHyperbolicRegularNgon,
    isHyperbolicNgonFeasible,
    solveHyperbolicVertexRadius,
} from "@/geom/polygon/hyperbolicRegular";

describe("hyperbolic regular n-gon geometry", () => {
    it("rejects infeasible input", () => {
        expect(isHyperbolicNgonFeasible(4, 3)).toBe(false);
        expect(() => buildHyperbolicRegularNgon({ n: 4, q: 3 })).toThrowError();
    });

    it("computes rho from alpha", () => {
        const rho = solveHyperbolicVertexRadius(7, (2 * Math.PI) / 4);
        expect(rho).toBeGreaterThan(0);
        expect(rho).toBeLessThan(1);
    });

    it("builds vertices and geodesics inside the unit disk", () => {
        const result = buildHyperbolicRegularNgon({ n: 7, q: 4 });
        expect(result.vertices).toHaveLength(7);
        expect(result.geodesics).toHaveLength(7);
        expect(result.alpha).toBeCloseTo((2 * Math.PI) / 4, 12);
        for (const vertex of result.vertices) {
            expect(Math.hypot(vertex.x, vertex.y)).toBeLessThan(1);
        }
        for (const boundary of result.geodesics) {
            if (boundary.kind === "circle") {
                const centerNormSq =
                    boundary.center.x * boundary.center.x + boundary.center.y * boundary.center.y;
                const orthogonality = centerNormSq - boundary.radius * boundary.radius;
                expect(orthogonality).toBeCloseTo(1, 10);
            } else {
                const normalLength = Math.hypot(boundary.normal.x, boundary.normal.y);
                expect(normalLength).toBeCloseTo(1, 12);
            }
        }
    });
});
