import { describe, expect, it } from "vitest";
import type { HyperbolicScene } from "../../../../src/render/scene";
import {
    createGeodesicUniformBuffers,
    packSceneGeodesics,
} from "../../../../src/render/webgl/geodesicUniforms";

const SCENE: HyperbolicScene = {
    geometry: "hyperbolic",
    disk: { cx: 100, cy: 100, r: 90 },
    geodesics: [
        {
            kind: "circle",
            id: "c:0",
            faceId: "f0",
            faceWord: "",
            edgeIndex: 0,
            geodesic: { kind: "circle", c: { x: 0, y: 0 }, r: 0.5 },
            circle: { cx: 120, cy: 120, r: 60 },
        },
        {
            kind: "line",
            id: "l:1",
            faceId: "f0",
            faceWord: "",
            edgeIndex: 1,
            geodesic: { kind: "diameter", dir: { x: 1, y: 0 } },
            line: { x1: 80, y1: 120, x2: 160, y2: 120 },
        },
    ],
};

describe("packSceneGeodesics", () => {
    it("packs circle and line primitives into uniform buffers", () => {
        const buffers = createGeodesicUniformBuffers(4);
        const count = packSceneGeodesics(SCENE, buffers);
        expect(count).toBe(2);
        expect(Array.from(buffers.data.slice(0, 4))).toEqual([0, 0, 0.5, 0]);
        // line entry
        const lineOffset = 4;
        const data = Array.from(buffers.data.slice(lineOffset, lineOffset + 4));
        expect(data[0]).toBeCloseTo(0, 12);
        expect(data[1]).toBeCloseTo(1, 12);
        expect(data[2]).toBeCloseTo(0, 12);
        expect(data[3]).toBe(1);
    });

    it("clears the remainder of the buffers when there are fewer primitives than slots", () => {
        const buffers = createGeodesicUniformBuffers(4);
        buffers.data.fill(123);
        const count = packSceneGeodesics({ ...SCENE, geodesics: [SCENE.geodesics[0]] }, buffers);
        expect(count).toBe(1);
        expect(buffers.data[0]).toBe(0);
        expect(buffers.data[3]).toBe(0);
        // remainder cleared
        const tail = buffers.data.slice(4);
        expect(Array.from(tail)).toEqual(Array(tail.length).fill(0));
    });

    it("caps the number of packed primitives by the provided limit", () => {
        const buffers = createGeodesicUniformBuffers(1);
        const count = packSceneGeodesics(SCENE, buffers, 1);
        expect(count).toBe(1);
        expect(buffers.data.slice(4)).toEqual(new Float32Array([]));
    });
});
