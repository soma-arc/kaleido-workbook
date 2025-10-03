import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import type { TilingParams } from "@/geom/triangle/tiling";
import { attachResize, setCanvasDPR } from "./canvas";
import {
    type CanvasTileRenderOptions,
    type HalfPlaneHandleOverlay,
    renderHandleOverlay,
    renderTileLayer,
} from "./canvasLayers";
import { buildEuclideanScene, buildHyperbolicScene, type RenderScene } from "./scene";
import type { Viewport } from "./viewport";
import type { SceneTextureLayer, TextureLayer } from "./webgl/textures";
import { createWebGLRenderer, type WebGLInitResult } from "./webglRenderer";

export type RenderMode = "canvas" | "hybrid";

export type HalfPlaneHandleRequest = {
    visible: boolean;
    items: Array<{ planeIndex: number; points: HalfPlaneControlPoints }>;
    active?: { planeIndex: number; pointIndex: 0 | 1 } | null;
    radius?: number;
};

type RenderRequestBase = {
    textures?: TextureLayer[];
};

export type GeometryRenderRequest =
    | ({ geometry: typeof GEOMETRY_KIND.hyperbolic; params: TilingParams } & RenderRequestBase)
    | ({
          geometry: typeof GEOMETRY_KIND.euclidean;
          halfPlanes: HalfPlane[];
          handles?: HalfPlaneHandleRequest;
      } & RenderRequestBase);

export interface RenderEngine {
    render(request: GeometryRenderRequest): void;
    dispose(): void;
    getMode(): RenderMode;
}

export type RenderEngineOptions = {
    mode?: RenderMode;
};

const DEFAULT_MODE: RenderMode = "hybrid";

function extractSceneTextures(layers?: TextureLayer[]): SceneTextureLayer[] {
    if (!layers?.length) {
        return [];
    }
    return layers.map((layer) => ({
        slot: layer.slot,
        kind: layer.kind,
        enabled: layer.enabled,
        transform: layer.transform,
        opacity: layer.opacity,
    }));
}

export function detectRenderMode(): RenderMode {
    const envMode = safeString(readEnvRenderMode());
    if (isRenderMode(envMode)) return envMode;
    if (typeof window !== "undefined") {
        const globalMode = safeString(
            (window as unknown as { __HP_RENDER_MODE__?: string }).__HP_RENDER_MODE__,
        );
        if (isRenderMode(globalMode)) return globalMode;
    }
    return DEFAULT_MODE;
}

export function createRenderEngine(
    canvas: HTMLCanvasElement,
    options: RenderEngineOptions = {},
): RenderEngine {
    const mode = options.mode ?? detectRenderMode();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas 2D context is required for render engine");
    }

    const webgl = mode === "hybrid" ? createWebGLRenderer() : null;
    const resizeHandlers: Array<() => void> = [];
    let lastRequest: GeometryRenderRequest | null = null;
    let disposed = false;

    const renderScene = (request: GeometryRenderRequest) => {
        if (disposed) return;
        lastRequest = request;
        setCanvasDPR(canvas);
        const rect = canvas.getBoundingClientRect();
        const viewport = computeViewport(rect, canvas);
        const textures = request.textures ?? [];
        const sceneTextures = extractSceneTextures(textures);
        let scene: RenderScene;
        try {
            scene =
                request.geometry === GEOMETRY_KIND.hyperbolic
                    ? buildHyperbolicScene(request.params, viewport, { textures: sceneTextures })
                    : buildEuclideanScene(request.halfPlanes, viewport, {
                          textures: sceneTextures,
                      });
        } catch (error) {
            console.error("[RenderEngine] Failed to build scene", error);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        const hasWebGLOutput = Boolean(webgl?.ready && webgl.canvas);
        const canvasStyle: CanvasTileRenderOptions = {
            drawDisk: scene.geometry === GEOMETRY_KIND.hyperbolic,
        };
        let handleOverlay: HalfPlaneHandleOverlay | null = null;
        if (hasWebGLOutput) {
            canvasStyle.tileStroke = "rgba(0,0,0,0)";
        }
        if (
            scene.geometry === GEOMETRY_KIND.euclidean &&
            request.geometry === GEOMETRY_KIND.euclidean
        ) {
            const handles = request.handles;
            if (handles?.visible) {
                handleOverlay = {
                    visible: true,
                    handles: handles.items,
                    active: handles.active ?? null,
                    radius: handles.radius,
                };
            }
        }
        renderCanvasLayer(ctx, scene, viewport, canvasStyle);
        if (webgl) {
            const clipToDisk = scene.geometry === GEOMETRY_KIND.hyperbolic;
            const renderOptions = { clipToDisk, textures } as const;
            if (hasWebGLOutput) {
                syncWebGLCanvas(webgl, canvas);
                webgl.renderer.render(scene, viewport, renderOptions);
                if (webgl.canvas) {
                    ctx.drawImage(webgl.canvas, 0, 0, canvas.width, canvas.height);
                }
            } else {
                webgl.renderer.render(scene, viewport, renderOptions);
            }
        }
        if (handleOverlay?.visible) {
            renderHandleOverlay(ctx, viewport, handleOverlay);
        }
    };

    resizeHandlers.push(
        attachResize(canvas, () => {
            if (!lastRequest) return;
            renderScene(lastRequest);
        }),
    );

    return {
        render: renderScene,
        dispose: () => {
            disposed = true;
            for (const disposeHandler of resizeHandlers) disposeHandler();
            if (webgl) {
                webgl.renderer.dispose();
            }
        },
        getMode: () => mode,
    };
}

function renderCanvasLayer(
    ctx: CanvasRenderingContext2D,
    scene: RenderScene,
    viewport: Viewport,
    options?: CanvasTileRenderOptions,
) {
    renderTileLayer(ctx, scene, viewport, options);
}

function computeViewport(rect: DOMRect, canvas: HTMLCanvasElement): Viewport {
    const width = rect.width || canvas.width || 1;
    const height = rect.height || canvas.height || 1;
    const size = Math.min(width, height);
    const margin = 8;
    const scale = Math.max(1, size / 2 - margin);
    return { scale, tx: width / 2, ty: height / 2 };
}

function syncWebGLCanvas(webgl: WebGLInitResult, uiCanvas: HTMLCanvasElement) {
    if (!webgl.canvas) return;
    webgl.canvas.width = uiCanvas.width;
    webgl.canvas.height = uiCanvas.height;
}

function safeString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function isRenderMode(value: string | null): value is RenderMode {
    return value === "canvas" || value === "hybrid";
}

function readEnvRenderMode(): string | null {
    try {
        const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
        return meta.env?.VITE_RENDER_MODE ?? null;
    } catch {
        return null;
    }
}
