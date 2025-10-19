import type { RenderEngine, RenderMode } from "@/render/engine";

export function createImmediateRenderEngine(mode: RenderMode = "canvas"): RenderEngine {
    return {
        render: () => {
            /* no-op */
        },
        capture: () => document.createElement("canvas"),
        dispose: () => {
            /* no-op */
        },
        getMode: () => mode,
    };
}
