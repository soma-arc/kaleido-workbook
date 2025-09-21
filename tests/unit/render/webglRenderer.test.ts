import { describe, expect, it, vi } from "vitest";
import type { TileScene } from "../../../src/render/scene";
import { createWebGLRenderer } from "../../../src/render/webglRenderer";

const SCENE: TileScene = {
    disk: { cx: 0, cy: 0, r: 1 },
    tiles: [],
};

describe("createWebGLRenderer", () => {
    it("logs an error when WebGL context is unavailable", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { renderer } = createWebGLRenderer();
        expect(errorSpy).toHaveBeenCalled();
        renderer.render(SCENE);
        renderer.dispose();
        errorSpy.mockRestore();
    });
});
