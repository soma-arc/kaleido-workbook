import { describe, expect, it } from "vitest";
import { buildFundamentalTriangle } from "../../../src/geom/triangle-fundamental";
import { expandTriangleGroup } from "../../../src/geom/triangle-group";
import { facesToTrianglePaths, orderAndCullTrianglePaths } from "../../../src/render/tilingAdapter";

// Minimal smoke tests for Issue #79 wiring

describe("tilingAdapter triangle path wiring", () => {
    const base = buildFundamentalTriangle(7, 3, 2);
    const { faces } = expandTriangleGroup(base, 1); // shallow depth

    it("converts faces to triangle paths (segments length=3)", () => {
        const tris = facesToTrianglePaths(faces);
        expect(tris.length).toBe(faces.length);
        expect(tris[0].segments.length).toBe(3);
    });

    it("emits at least one arc segment for circle geodesic edges", () => {
        const tris = facesToTrianglePaths(faces);
        // Fundamental triangle has one circular mirror => its adjacent edges should yield arcs
        const arcCount = tris.flatMap((t) => t.segments).filter((s) => s.kind === "arc").length;
        expect(arcCount).toBeGreaterThan(0);
    });

    it("orders and culls (no cull at default)", () => {
        const ordered = orderAndCullTrianglePaths(faces);
        expect(ordered.length).toBeGreaterThan(0);
        for (let i = 1; i < ordered.length; i++) {
            const prev = ordered[i - 1];
            const cur = ordered[i];
            // lexicographic non-decreasing
            if (cur.barycenter.x === prev.barycenter.x) {
                expect(cur.barycenter.y).toBeGreaterThanOrEqual(prev.barycenter.y);
            } else {
                expect(cur.barycenter.x).toBeGreaterThanOrEqual(prev.barycenter.x);
            }
        }
    });
});
