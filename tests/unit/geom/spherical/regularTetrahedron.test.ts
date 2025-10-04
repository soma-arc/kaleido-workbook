import { describe, expect, it } from "vitest";
import {
    createRegularTetrahedronTriangle,
    createRegularTetrahedronTriangles,
    createRegularTetrahedronVertices,
} from "@/geom/spherical/regularTetrahedron";
import { dotVec3, isRightHandedTriangle, isUnitVec3 } from "@/geom/spherical/types";

const TOL = 1e-12;

function pairwise<T>(list: readonly T[]): Array<[T, T]> {
    const result: Array<[T, T]> = [];
    for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
            result.push([list[i], list[j]]);
        }
    }
    return result;
}

describe("createRegularTetrahedronVertices", () => {
    it("returns four unit vectors with uniform pairwise dot products", () => {
        const vertices = createRegularTetrahedronVertices();
        expect(vertices).toHaveLength(4);
        for (const vertex of vertices) {
            expect(isUnitVec3(vertex, TOL)).toBe(true);
        }
        const dots = pairwise(vertices).map(([a, b]) => dotVec3(a, b));
        const reference = dots[0];
        for (const value of dots) {
            expect(value).toBeCloseTo(reference, 12);
        }
        expect(reference).toBeCloseTo(-1 / 3, 12);
    });
});

describe("createRegularTetrahedronTriangle", () => {
    it("returns right-handed unique triangles for all faces", () => {
        const triangles = createRegularTetrahedronTriangles();
        expect(triangles).toHaveLength(4);
        const seen = new Set<string>();
        triangles.forEach((triangle, index) => {
            expect(isRightHandedTriangle(triangle)).toBe(true);
            const direct = createRegularTetrahedronTriangle(index);
            expect(isRightHandedTriangle(direct)).toBe(true);
            const key = direct.vertices
                .map(
                    (vertex) =>
                        `${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${vertex.z.toFixed(6)}`,
                )
                .join("|");
            expect(seen.has(key)).toBe(false);
            seen.add(key);
        });
    });
});
