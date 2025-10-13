import { describe, expect, it } from "vitest";

import { buildHyperbolicScene } from "@/render/scene";
import { identity, type Viewport } from "@/render/viewport";
import {
    createGeodesicUniformBuffers,
    GEODESIC_KIND_CIRCLE,
    GEODESIC_KIND_LINE,
    packSceneGeodesics,
} from "@/render/webgl/geodesicUniforms";

const VIEWPORT: Viewport = identity;

describe("render/webgl/geodesicUniforms", () => {
    it("packs oriented hyperbolic geodesics preserving orientation", () => {
        const scene = buildHyperbolicScene({ p: 2, q: 3, r: 7, depth: 1 }, VIEWPORT);
        const buffers = createGeodesicUniformBuffers(3);
        const count = packSceneGeodesics(scene, buffers, 3);
        expect(count).toBe(scene.renderGeodesics.length);

        const [lineA, lineB, circle] = scene.renderGeodesics;
        if (!lineA || lineA.kind !== "line") throw new Error("expected first boundary line");
        if (!lineB || lineB.kind !== "line") throw new Error("expected second boundary line");
        if (!circle || circle.kind !== "circle") throw new Error("expected third boundary circle");

        // line A
        expect(buffers.kinds[0]).toBe(GEODESIC_KIND_LINE);
        expect(buffers.data[0]).toBeCloseTo(lineA.normal.x, 12);
        expect(buffers.data[1]).toBeCloseTo(lineA.normal.y, 12);
        expect(buffers.data[2]).toBeCloseTo(lineA.anchor.x, 12);
        expect(buffers.data[3]).toBeCloseTo(lineA.anchor.y, 12);

        // line B
        const offsetB = 4;
        expect(buffers.kinds[1]).toBe(GEODESIC_KIND_LINE);
        expect(buffers.data[offsetB + 0]).toBeCloseTo(lineB.normal.x, 12);
        expect(buffers.data[offsetB + 1]).toBeCloseTo(lineB.normal.y, 12);

        // circle
        const offsetC = 8;
        expect(buffers.kinds[2]).toBe(GEODESIC_KIND_CIRCLE);
        expect(buffers.data[offsetC + 0]).toBeCloseTo(circle.center.x, 6);
        expect(buffers.data[offsetC + 1]).toBeCloseTo(circle.center.y, 6);
        expect(buffers.data[offsetC + 2]).toBeCloseTo(circle.radius, 6);
        expect(buffers.data[offsetC + 3]).toBe(circle.orientation);
    });
});
