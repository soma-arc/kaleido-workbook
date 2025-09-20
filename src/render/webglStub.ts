import type { TileScene } from "./scene";

export interface WebGLRenderer {
    render(scene: TileScene): void;
    dispose(): void;
}

export type WebGLInitResult = {
    renderer: WebGLRenderer;
    canvas: HTMLCanvasElement | null;
};

export function createWebGLRenderer(): WebGLInitResult {
    const glCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    const gl = glCanvas ? acquireWebGLContext(glCanvas) : null;
    if (!gl) {
        console.error(
            "[render] WebGL initialisation failed – hybrid renderer running without GL tiles",
        );
    }
    return {
        canvas: glCanvas,
        renderer: {
            render: (scene: TileScene) => {
                if (!gl) return;
                // Placeholder: future implementation will upload tile primitives and draw via GLSL.
                void scene;
            },
            dispose: () => {
                if (!glCanvas) return;
                // In browsers there is no explicit dispose for WebGL contexts; releasing references is enough.
                glCanvas.width = 0;
                glCanvas.height = 0;
            },
        },
    };
}

function acquireWebGLContext(
    canvas: HTMLCanvasElement,
): WebGLRenderingContext | WebGL2RenderingContext | null {
    const attributes: WebGLContextAttributes = { preserveDrawingBuffer: true, antialias: true };
    const gl2 = canvas.getContext("webgl2", attributes) as WebGL2RenderingContext | null;
    if (gl2) return gl2;
    const gl = canvas.getContext("webgl", attributes) as WebGLRenderingContext | null;
    if (gl) return gl;
    return canvas.getContext("experimental-webgl", attributes) as WebGLRenderingContext | null;
}
