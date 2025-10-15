import { describe, expect, it } from "vitest";
import { evaluateHalfPlane, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";

function length(v: { x: number; y: number }): number {
    return Math.hypot(v.x, v.y);
}

function barycenter(
    verts: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }],
) {
    return {
        x: (verts[0].x + verts[1].x + verts[2].x) / 3,
        y: (verts[0].y + verts[1].y + verts[2].y) / 3,
    };
}

describe("buildEuclideanTriangle", () => {
    it("returns unit-norm mirrors whose boundaries pass through the expected vertices", () => {
        const tri = buildEuclideanTriangle(2, 4, 4);
        const { boundaries, vertices } = tri;
        const edges: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
            [vertices[1], vertices[2]],
            [vertices[0], vertices[2]],
            [vertices[0], vertices[1]],
        ];
        boundaries.forEach((plane, index) => {
            const unit = normalizeHalfPlane(plane);
            expect(length(unit.normal)).toBeCloseTo(1, 12);
            const [a, b] = edges[index];
            expect(evaluateHalfPlane(unit, a)).toBeCloseTo(0, 9);
            expect(evaluateHalfPlane(unit, b)).toBeCloseTo(0, 9);
        });
    });

    it("places the triangle interior on the negative side of every mirror", () => {
        const tri = buildEuclideanTriangle(3, 3, 3);
        const center = barycenter(tri.vertices);
        for (const plane of tri.boundaries) {
            const unit = normalizeHalfPlane(plane);
            const value = evaluateHalfPlane(unit, center);
            expect(value).toBeGreaterThan(0);
        }
    });

    it("produces angles that match the requested (p,q,r)", () => {
        const tri = buildEuclideanTriangle(2, 3, 6);
        const [alpha, beta, gamma] = tri.angles;
        expect(alpha).toBeCloseTo(Math.PI / 2, 9);
        expect(beta).toBeCloseTo(Math.PI / 3, 9);
        expect(gamma).toBeCloseTo(Math.PI / 6, 9);
    });

    it("recenters triangle vertices so the barycenter lies at the origin", () => {
        const tri = buildEuclideanTriangle(2, 4, 4);
        const center = barycenter(tri.vertices);
        expect(center.x).toBeCloseTo(0, 12);
        expect(center.y).toBeCloseTo(0, 12);
    });
});
