import { describe, expect, it } from "vitest";
import { SphericalOrbitCamera } from "@/render/spherical/camera";

function transformPoint(matrix: Float32Array, point: { x: number; y: number; z: number }) {
    const x = matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12];
    const y = matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13];
    const z = matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14];
    return { x, y, z };
}

describe("SphericalOrbitCamera", () => {
    it("computes eye position and view matrix for default state", () => {
        const camera = new SphericalOrbitCamera();
        const eye = camera.getEyePosition();
        expect(eye.x).toBeCloseTo(0, 12);
        expect(eye.y).toBeCloseTo(0, 12);
        expect(eye.z).toBeCloseTo(3, 12);
        const view = camera.getViewMatrix();
        const transformedOrigin = transformPoint(view, { x: 0, y: 0, z: 0 });
        expect(transformedOrigin.x).toBeCloseTo(0, 12);
        expect(transformedOrigin.y).toBeCloseTo(0, 12);
        expect(transformedOrigin.z).toBeCloseTo(-eye.z, 12);
    });

    it("supports azimuth rotation around the Y axis", () => {
        const camera = new SphericalOrbitCamera({ distance: 5 });
        camera.orbit(Math.PI / 2, 0);
        const eye = camera.getEyePosition();
        expect(eye.x).toBeCloseTo(5, 12);
        expect(eye.z).toBeCloseTo(0, 12);
    });

    it("clamps elevation to configured limits", () => {
        const camera = new SphericalOrbitCamera({ maxElevation: Math.PI / 4 });
        camera.orbit(0, Math.PI / 2);
        const state = camera.getState();
        expect(state.elevation).toBeCloseTo(Math.PI / 4, 12);
    });

    it("clamps zoom range", () => {
        const camera = new SphericalOrbitCamera({ minDistance: 2, maxDistance: 4, distance: 3 });
        camera.zoom(-10);
        expect(camera.getState().distance).toBeCloseTo(2, 12);
        camera.zoom(10);
        expect(camera.getState().distance).toBeCloseTo(4, 12);
    });

    it("normalises angles when setting state", () => {
        const camera = new SphericalOrbitCamera();
        camera.setState({ azimuth: 3 * Math.PI });
        expect(camera.getState().azimuth).toBeCloseTo(Math.PI, 12);
    });
});
