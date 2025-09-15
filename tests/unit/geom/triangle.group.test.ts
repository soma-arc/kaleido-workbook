import { describe, expect, it } from "vitest";
import { buildFundamentalTriangle } from "../../../src/geom/triangle-fundamental";
import { expandTriangleGroup } from "../../../src/geom/triangle-group";

describe("geom/triangle-group", () => {
    it("expands BFS deterministically without duplicates (depth=2)", () => {
        const base = buildFundamentalTriangle(2, 3, 7);
        const { faces, stats } = expandTriangleGroup(base, 2);
        expect(faces.length).toBeGreaterThanOrEqual(3);
        // determinism
        const { faces: faces2 } = expandTriangleGroup(base, 2);
        expect(faces.map((f) => f.id)).toEqual(faces2.map((f) => f.id));
        // duplicate-free by id uniqueness
        const set = new Set(faces.map((f) => f.id));
        expect(set.size).toBe(faces.length);
        expect(stats.depth).toBe(2);
    });
});
