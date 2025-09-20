import { describe, expect, it } from "vitest";
import { buildTileScene } from "../../../src/render/scene";
import type { Viewport } from "../../../src/render/viewport";

const VIEWPORT: Viewport = { scale: 100, tx: 120, ty: 120 };

describe("buildTileScene", () => {
    it("returns disk and tile primitives", () => {
        const scene = buildTileScene({ p: 2, q: 3, r: 7, depth: 1 }, VIEWPORT);
        expect(scene.disk.r).toBeGreaterThan(0);
        expect(scene.tiles.length).toBeGreaterThan(0);
        expect(scene.tiles[0]).toHaveProperty("kind");
    });
});
