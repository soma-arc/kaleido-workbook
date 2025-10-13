import { describe, expect, it } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { halfPlaneFromNormalAndOffset, halfPlaneOffset } from "@/geom/primitives/halfPlane";
import type { OrientedGeodesic } from "@/geom/primitives/orientedGeodesic";
import type { EuclideanScene, HyperbolicScene } from "@/render/scene";
import {
    createGeodesicUniformBuffers,
    GEODESIC_KIND_CIRCLE,
    GEODESIC_KIND_LINE,
    packSceneGeodesics,
} from "@/render/webgl/geodesicUniforms";

const SCENE: HyperbolicScene = {
    geometry: GEOMETRY_KIND.hyperbolic,
    disk: { cx: 100, cy: 100, r: 90 },
    renderGeodesics: [
        { kind: "circle", center: { x: 0, y: 0 }, radius: 0.5, orientation: 1 } as OrientedGeodesic,
        { kind: "line", anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } } as OrientedGeodesic,
    ],
    tile: undefined,
    textures: [],
};

const EUCLIDEAN_SCENE: EuclideanScene = {
    geometry: GEOMETRY_KIND.euclidean,
    halfPlanes: [
        { anchor: { x: 0, y: 0 }, normal: { x: 1, y: 0 } },
        { anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } },
    ],
    textures: [],
};

describe("packSceneGeodesics", () => {
    it("packs circle and line primitives into uniform buffers", () => {
        const buffers = createGeodesicUniformBuffers(4);
        const count = packSceneGeodesics(SCENE, buffers);
        expect(count).toBe(2);
        expect(Array.from(buffers.data.slice(0, 4))).toEqual([0, 0, 0.5, 1]);
        expect(buffers.kinds[0]).toBe(GEODESIC_KIND_CIRCLE);
        // line entry
        const lineOffset = 4;
        const data = Array.from(buffers.data.slice(lineOffset, lineOffset + 4));
        expect(data[0]).toBeCloseTo(0, 12);
        expect(data[1]).toBeCloseTo(1, 12);
        expect(data[2]).toBeCloseTo(0, 12);
        expect(data[3]).toBeCloseTo(0, 12);
        expect(buffers.kinds[1]).toBe(GEODESIC_KIND_LINE);
    });

    it("clears the remainder of the buffers when there are fewer primitives than slots", () => {
        const buffers = createGeodesicUniformBuffers(4);
        buffers.data.fill(123);
        const count = packSceneGeodesics(
            { ...SCENE, renderGeodesics: [SCENE.renderGeodesics[0]] },
            buffers,
        );
        expect(count).toBe(1);
        expect(buffers.data[0]).toBe(0);
        expect(buffers.data[3]).toBe(1);
        expect(buffers.kinds[0]).toBe(GEODESIC_KIND_CIRCLE);
        // remainder cleared
        const tail = buffers.data.slice(4);
        expect(Array.from(tail)).toEqual(Array(tail.length).fill(0));
        const kindTail = buffers.kinds.slice(1);
        expect(Array.from(kindTail)).toEqual(Array(kindTail.length).fill(0));
    });

    it("caps the number of packed primitives by the provided limit", () => {
        const buffers = createGeodesicUniformBuffers(1);
        const count = packSceneGeodesics(SCENE, buffers, 1);
        expect(count).toBe(1);
        expect(buffers.data.slice(4)).toEqual(new Float32Array([]));
        expect(buffers.kinds.slice(1)).toEqual(new Int32Array([]));
    });

    it("packs euclidean half-planes as lines", () => {
        const buffers = createGeodesicUniformBuffers(4);
        const count = packSceneGeodesics(EUCLIDEAN_SCENE, buffers);
        expect(count).toBe(EUCLIDEAN_SCENE.halfPlanes.length);
        const data = Array.from(buffers.data.slice(0, 4));
        expect(Math.hypot(data[0], data[1])).toBeCloseTo(1, 12);
        expect(data[2]).toBeCloseTo(0, 12);
        expect(data[3]).toBeCloseTo(0, 12);
        expect(buffers.kinds[0]).toBe(1);
    });

    it("preserves euclidean half-plane orientation for signed distance evaluation", () => {
        const plane: HalfPlane = halfPlaneFromNormalAndOffset({ x: -1, y: 0 }, 0.5);
        expect(halfPlaneOffset(plane)).toBeCloseTo(0.5, 12);
        const buffers = createGeodesicUniformBuffers(4);
        const scene: EuclideanScene = {
            geometry: GEOMETRY_KIND.euclidean,
            halfPlanes: [plane],
            textures: [],
        };
        const count = packSceneGeodesics(scene, buffers);
        expect(count).toBe(1);
        const [nx, ny, ax, ay] = Array.from(buffers.data.slice(0, 4));
        expect(buffers.kinds[0]).toBe(1);
        const evaluate = (point: { x: number; y: number }) =>
            nx * (point.x - ax) + ny * (point.y - ay);
        expect(evaluate({ x: 0.25, y: 0 })).toBeGreaterThan(0);
        expect(evaluate({ x: 0.75, y: 0 })).toBeLessThan(0);
    });
});
