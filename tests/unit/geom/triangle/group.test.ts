import { describe, expect, it } from "vitest";
import { expandHyperbolicTriangleGroup } from "@/geom/triangle/group";
import { buildHyperbolicTriangle } from "@/geom/triangle/hyperbolicTriangle";

describe("geom/triangle/group", () => {
    it("expands BFS deterministically without duplicates (depth=2)", () => {
        const base = buildHyperbolicTriangle(2, 3, 7);
        const { faces, stats } = expandHyperbolicTriangleGroup(base, 2);
        expect(faces.length).toBeGreaterThanOrEqual(3);
        // determinism
        const { faces: faces2 } = expandHyperbolicTriangleGroup(base, 2);
        expect(faces.map((f) => f.id)).toEqual(faces2.map((f) => f.id));
        // duplicate-free by id uniqueness
        const set = new Set(faces.map((f) => f.id));
        expect(set.size).toBe(faces.length);
        expect(stats.depth).toBe(2);
    });
});
