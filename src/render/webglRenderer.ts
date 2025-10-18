import type { SceneDefinition } from "@/ui/scenes/types";
import type { RenderScene } from "./scene";
import type { Viewport } from "./viewport";
import {
    resolveWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "./webgl/pipelineRegistry";
import type { TextureLayer } from "./webgl/textures";
import "./webgl/pipelines/hyperbolicGeodesicPipeline";
import "./webgl/pipelines/euclideanHalfPlanePipeline";
import "./webgl/pipelines/euclideanCircleInversionPipeline";
import "./webgl/pipelines/sphericalPipeline";
import "./webgl/pipelines/debugTexturePipeline";
import "@/scenes/hyperbolic/tiling-333/pipeline";
import "./webgl/pipelines/facingMirrorPipeline";

type RenderOptions = {
    clipToDisk?: boolean;
    textures?: TextureLayer[];
    scene?: SceneDefinition;
};

export interface WebGLRenderer {
    render(scene: RenderScene, viewport: Viewport, options?: RenderOptions): void;
    dispose(): void;
}

export type WebGLInitResult = {
    renderer: WebGLRenderer;
    canvas: HTMLCanvasElement | null;
    ready: boolean;
};

/**
 * Builds a WebGL renderer that dispatches rendering to registered pipelines with automatic context fallback handling.
 */
export function createWebGLRenderer(): WebGLInitResult {
    const glCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!glCanvas) {
        console.error("[render] WebGL2 is unavailable in this environment");
        return createStubRenderer(null);
    }

    const gl = glCanvas.getContext("webgl2", {
        preserveDrawingBuffer: true,
        antialias: true,
    }) as WebGL2RenderingContext | null;

    if (!gl) {
        console.error("[render] WebGL2 context acquisition failed");
        return createStubRenderer(glCanvas);
    }

    try {
        return createRealRenderer(glCanvas, gl);
    } catch (error) {
        console.error("[render] WebGL renderer initialisation failed", error);
        return createStubRenderer(glCanvas);
    }
}

function createStubRenderer(canvas: HTMLCanvasElement | null): WebGLInitResult {
    return {
        canvas,
        ready: false,
        renderer: {
            render: (_scene: RenderScene, _viewport: Viewport, _options?: RenderOptions) => {
                /* no-op */
            },
            dispose: () => {
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                }
            },
        },
    };
}

function createRealRenderer(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
): WebGLInitResult {
    let active: { id: string; instance: WebGLPipelineInstance } | null = null;

    const ensurePipeline = (scene: SceneDefinition | undefined): WebGLPipelineInstance => {
        const registration = resolveWebGLPipeline(scene);
        if (!active || active.id !== registration.id) {
            active?.instance.dispose();
            active = {
                id: registration.id,
                instance: registration.factory(gl, canvas),
            };
        }
        return active.instance;
    };

    const renderer: WebGLRenderer = {
        render: (scene: RenderScene, viewport: Viewport, options?: RenderOptions) => {
            const pipeline = ensurePipeline(options?.scene);
            const context: WebGLPipelineRenderContext = {
                sceneDefinition: options?.scene,
                renderScene: scene,
                viewport,
                clipToDisk: options?.clipToDisk !== false,
                textures: options?.textures ?? [],
                canvas,
            };
            pipeline.render(context);
        },
        dispose: () => {
            active?.instance.dispose();
            active = null;
            canvas.width = 0;
            canvas.height = 0;
        },
    };

    return {
        canvas,
        ready: true,
        renderer,
    };
}
