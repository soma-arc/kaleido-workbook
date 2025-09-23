import { describe, expect, it } from "vitest";
import { buildTiling } from "@/geom/triangle/tiling";

describe("geom/triangle/tiling", () => {
    it("buildTiling produces deterministic faces and stats", () => {
        const params = { p: 2, q: 3, r: 7, depth: 2 };
        const { faces, stats } = buildTiling(params);
        expect(stats.depth).toBe(2);
        expect(faces.length).toBeGreaterThan(0);
        // determinism
        const { faces: faces2 } = buildTiling(params);
        expect(faces.map((f) => f.id)).toEqual(faces2.map((f) => f.id));
        // ordering: word length then lexicographic
        const words = faces.map((f) => f.word);
        const sorted = [...words].sort(
            (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0),
        );
        expect(words).toEqual(sorted);
        // aabb sanity
        for (const f of faces) {
            expect(f.aabb.min.x).toBeLessThanOrEqual(f.aabb.max.x);
            expect(f.aabb.min.y).toBeLessThanOrEqual(f.aabb.max.y);
        }
    });
});
