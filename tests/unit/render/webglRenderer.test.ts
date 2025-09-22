import { describe, expect, it, vi } from "vitest";
import type { HyperbolicScene } from "../../../src/render/scene";
import { createWebGLRenderer } from "../../../src/render/webglRenderer";

const SCENE: HyperbolicScene = {
    geometry: "hyperbolic",
    disk: { cx: 0, cy: 0, r: 1 },
    geodesics: [],
};

describe("createWebGLRenderer", () => {
    it("logs an error when WebGL context is unavailable", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { renderer } = createWebGLRenderer();
        expect(errorSpy).toHaveBeenCalled();
        renderer.render(SCENE, { scale: 1, tx: 0, ty: 0 });
        renderer.dispose();
        errorSpy.mockRestore();
    });
});
