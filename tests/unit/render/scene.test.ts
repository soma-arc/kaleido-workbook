import { describe, expect, it } from "vitest";
import type { HalfPlane } from "../../../src/geom/halfPlane";
import { buildEuclideanScene, buildHyperbolicScene } from "../../../src/render/scene";
import type { Viewport } from "../../../src/render/viewport";

const VIEWPORT: Viewport = { scale: 100, tx: 120, ty: 120 };
const PLANES: HalfPlane[] = [
    { normal: { x: 1, y: 0 }, offset: 0 },
    { normal: { x: 0, y: 1 }, offset: 0 },
    { normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 }, offset: 0 },
];

describe("buildHyperbolicScene", () => {
    it("returns disk and tile primitives", () => {
        const scene = buildHyperbolicScene({ p: 2, q: 3, r: 7, depth: 1 }, VIEWPORT);
        expect(scene.disk.r).toBeGreaterThan(0);
        expect(scene.geodesics.length).toBeGreaterThan(0);
        expect(scene.geodesics[0]).toHaveProperty("kind");
    });
});

describe("buildEuclideanScene", () => {
    it("returns geodesic primitives without disk", () => {
        const scene = buildEuclideanScene(PLANES, VIEWPORT);
        expect(scene.geometry).toBe("euclidean");
        expect(scene.halfPlanes.length).toBe(PLANES.length);
        expect((scene as unknown as { disk?: unknown }).disk).toBeUndefined();
    });
});
