import { describe, expect, it } from "vitest";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import { SphericalOrbitCamera } from "@/render/spherical/camera";
import {
    buildCameraUniforms,
    packSphericalTriangleVertices,
    validateSphericalTriangleVertices,
} from "@/render/spherical/uniforms";

function transformPoint(matrix: Float32Array, point: { x: number; y: number; z: number }) {
    const x = matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12];
    const y = matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13];
    const z = matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14];
    const w = matrix[3] * point.x + matrix[7] * point.y + matrix[11] * point.z + matrix[15];
    return { x, y, z, w };
}

describe("packSphericalTriangleVertices", () => {
    it("flattens triangle vertices into Float32Array", () => {
        const triangle = createRegularTetrahedronTriangle();
        const packed = packSphericalTriangleVertices(triangle);
        expect(packed).toBeInstanceOf(Float32Array);
        expect(packed).toHaveLength(9);
        expect(packed[0]).toBeCloseTo(triangle.vertices[0].x, 6);
        expect(packed[8]).toBeCloseTo(triangle.vertices[2].z, 6);
    });
});

describe("buildCameraUniforms", () => {
    it("returns view/projection matrices and camera position", () => {
        const camera = new SphericalOrbitCamera({ distance: 4 });
        const uniforms = buildCameraUniforms(camera, { aspect: 1 });
        expect(uniforms.view).toHaveLength(16);
        expect(uniforms.projection).toHaveLength(16);
        expect(uniforms.viewProjection).toHaveLength(16);
        expect(Array.from(uniforms.cameraPosition)).toEqual([0, 0, 4]);
        const clip = transformPoint(uniforms.viewProjection, { x: 0, y: 0, z: 0 });
        expect(clip.x).toBeCloseTo(0, 12);
        expect(clip.y).toBeCloseTo(0, 12);
        expect(clip.w).toBeGreaterThan(0);
        const ndcZ = clip.z / clip.w;
        expect(ndcZ).toBeLessThan(1);
        expect(ndcZ).toBeGreaterThan(-1);
    });

    it("throws when aspect ratio is non-positive", () => {
        const camera = new SphericalOrbitCamera();
        expect(() => buildCameraUniforms(camera, { aspect: 0 })).toThrow(/aspect ratio/i);
    });
});

describe("validateSphericalTriangleVertices", () => {
    it("accepts well-formed triangles", () => {
        const triangle = createRegularTetrahedronTriangle();
        expect(() => validateSphericalTriangleVertices(triangle)).not.toThrow();
    });

    it("rejects degenerate triangles", () => {
        const triangle = createRegularTetrahedronTriangle();
        triangle.vertices[0].x = 2; // 既存配列を直接汚染
        expect(() => validateSphericalTriangleVertices(triangle)).toThrow();
    });
});
