/* @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import { type Geodesic, geodesicFromBoundary } from "@/geom/primitives/geodesic";
import { angleToBoundaryPoint } from "@/geom/primitives/unitDisk";
import { buildTiling } from "@/geom/triangle/tiling";
import { geodesicSpec, unitDiskSpec } from "../../../src/render/primitives";
import { facesToEdgeGeodesics } from "../../../src/render/tilingAdapter";
import { identity, type Viewport } from "../../../src/render/viewport";

const close = (a: number, b: number, d = 1e-12) => Math.abs(a - b) <= d;

describe("render/primitives specs", () => {
    it("unitDiskSpec maps to screen with scale", () => {
        const vp: Viewport = { scale: 200, tx: 320, ty: 240 };
        const c = unitDiskSpec(vp);
        expect(close(c.cx, 320)).toBe(true);
        expect(close(c.cy, 240)).toBe(true);
        expect(close(c.r, 200)).toBe(true);
    });

    it("geodesicSpec(circle) produces screen circle", () => {
        const a = angleToBoundaryPoint(0);
        const b = angleToBoundaryPoint(Math.PI / 3);
        const g: Geodesic = geodesicFromBoundary(a, b);
        const vp = identity;
        if (g.kind !== "circle") throw new Error("expected circle geodesic");
        const s = geodesicSpec(g, vp);
        if ("r" in s) {
            // radius equals world radius when scale=1
            expect(s.r).toBeCloseTo(g.r, 12);
        } else {
            throw new Error("expected circle spec");
        }
    });

    it("geodesicSpec(diameter) produces a line through ±dir", () => {
        const a = angleToBoundaryPoint(0);
        const b = angleToBoundaryPoint(Math.PI);
        const g: Geodesic = geodesicFromBoundary(a, b);
        expect(g.kind).toBe("diameter");
        const s = geodesicSpec(g, identity);
        if ("x1" in s) {
            expect(close(s.y1, s.y2)).toBe(true); // horizontal line
            expect(close(s.x1, -1) && close(s.x2, 1)).toBe(true);
        } else {
            throw new Error("expected line spec");
        }
    });

    it("facesToEdgeGeodesics returns stable-ordered edges", () => {
        const { faces } = buildTiling({ p: 2, q: 3, r: 7, depth: 2 });
        const edges = facesToEdgeGeodesics(faces);
        // stable order: by face.word length then lexicographic, and within each face by local edge index 0,1,2
        const words = faces.map((f) => f.word);
        const sortedWords = [...words].sort(
            (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0),
        );
        expect(words).toEqual(sortedWords);
        // edges must be grouped by faces in that order, 3 per face
        expect(edges.length % 3).toBe(0);
        const grouped = [] as string[];
        for (let i = 0; i < edges.length; i += 3) grouped.push(edges[i].faceWord);
        expect(grouped).toEqual(words);
    });
});
