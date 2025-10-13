import { describe, expect, it } from "vitest";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { buildEuclideanScene, buildHyperbolicScene } from "@/render/scene";
import type { Viewport } from "@/render/viewport";
import type { CircleInversionState } from "@/ui/scenes/circleInversionConfig";

const VIEWPORT: Viewport = { scale: 100, tx: 120, ty: 120 };
const PLANES: HalfPlane[] = [
    { anchor: { x: 0, y: 0 }, normal: { x: 1, y: 0 } },
    { anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } },
    { anchor: { x: 0, y: 0 }, normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 } },
];

describe("buildHyperbolicScene", () => {
    it("returns disk and tile primitives", () => {
        const scene = buildHyperbolicScene({ p: 2, q: 3, r: 7, depth: 1 }, VIEWPORT);
        expect(scene.disk.r).toBeGreaterThan(0);
        expect(scene.renderGeodesics.length).toBeGreaterThan(0);
        expect(scene.renderGeodesics[0]).toHaveProperty("kind");
        expect(scene.tile?.edges.length ?? 0).toBeGreaterThan(0);
        expect(scene.textures).toEqual([]);
    });
});

describe("buildEuclideanScene", () => {
    it("returns geodesic primitives without disk", () => {
        const scene = buildEuclideanScene(PLANES, VIEWPORT);
        expect(scene.geometry).toBe("euclidean");
        expect(scene.halfPlanes.length).toBe(PLANES.length);
        expect((scene as unknown as { disk?: unknown }).disk).toBeUndefined();
        expect(scene.textures).toEqual([]);
    });

    it("includes inversion data when provided", () => {
        const inversion: CircleInversionState = {
            fixedCircle: { center: { x: 0, y: 0 }, radius: 0.5 },
            rectangle: {
                center: { x: 0.25, y: -0.1 },
                halfExtents: { x: 0.2, y: 0.12 },
                rotation: 0.1,
            },
        };
        const scene = buildEuclideanScene(PLANES, VIEWPORT, { inversion });
        expect(scene.inversion).toEqual(inversion);
    });
});
