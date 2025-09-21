import { describe, expect, it } from "vitest";
import type { TileScene } from "../../../../src/render/scene";
import {
    createGeodesicUniformBuffers,
    packSceneGeodesics,
} from "../../../../src/render/webgl/geodesicUniforms";

const SCENE: TileScene = {
    disk: { cx: 100, cy: 100, r: 90 },
    tiles: [
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
        expect(Array.from(buffers.dataA.slice(0, 4))).toEqual([120, 120, 60, 0]);
        expect(Array.from(buffers.dataB.slice(0, 4))).toEqual([0, 0, 0, 0]);
        // line entry
        const lineOffset = 4;
        const dataA = Array.from(buffers.dataA.slice(lineOffset, lineOffset + 4));
        const dataB = Array.from(buffers.dataB.slice(lineOffset, lineOffset + 4));
        expect(dataA[0]).toBe(80);
        expect(dataA[1]).toBe(120);
        expect(dataA[2]).toBeCloseTo(1, 12);
        expect(dataA[3]).toBe(1);
        expect(dataB[0]).toBeCloseTo(0, 12);
    });

    it("clears the remainder of the buffers when there are fewer primitives than slots", () => {
        const buffers = createGeodesicUniformBuffers(4);
        buffers.dataA.fill(123);
        buffers.dataB.fill(456);
        const count = packSceneGeodesics({ ...SCENE, tiles: [SCENE.tiles[0]] }, buffers);
        expect(count).toBe(1);
        expect(buffers.dataA[0]).toBe(120);
        expect(buffers.dataA[3]).toBe(0);
        // remainder cleared
        const tail = buffers.dataA.slice(4);
        expect(Array.from(tail)).toEqual(Array(tail.length).fill(0));
        expect(buffers.dataB[0]).toBe(0);
        expect(Array.from(buffers.dataB.slice(4))).toEqual(Array(buffers.dataB.length - 4).fill(0));
    });

    it("caps the number of packed primitives by the provided limit", () => {
        const buffers = createGeodesicUniformBuffers(1);
        const count = packSceneGeodesics(SCENE, buffers, 1);
        expect(count).toBe(1);
        expect(buffers.dataA.slice(4)).toEqual(new Float32Array([]));
    });
});
