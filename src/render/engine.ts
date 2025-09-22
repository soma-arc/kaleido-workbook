import type { HalfPlane } from "../geom/halfPlane";
import type { TilingParams } from "../geom/tiling";
import { attachResize, setCanvasDPR } from "./canvas";
import { type CanvasTileStyle, renderTileLayer } from "./canvasLayers";
import { buildHalfPlaneScene, buildHyperbolicScene, type HyperbolicScene } from "./scene";
import type { Viewport } from "./viewport";
import { createWebGLRenderer, type WebGLInitResult } from "./webglRenderer";

export type RenderMode = "canvas" | "hybrid";

export type GeometryRenderRequest =
    | { geometry: "hyperbolic"; params: TilingParams }
    | { geometry: "euclidean"; halfPlanes: HalfPlane[] };

export interface RenderEngine {
    render(request: GeometryRenderRequest): void;
    dispose(): void;
    getMode(): RenderMode;
}

export type RenderEngineOptions = {
    mode?: RenderMode;
};

const DEFAULT_MODE: RenderMode = "hybrid";

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
        const isHyperbolic = request.geometry === "hyperbolic";
        const scene = isHyperbolic
            ? buildHyperbolicScene(request.params, viewport)
            : buildHalfPlaneScene(request.halfPlanes, viewport);
        const hasWebGLOutput = Boolean(webgl?.ready && webgl.canvas);
        const canvasStyle: CanvasTileStyle = {
            drawDisk: isHyperbolic,
        };
        if (hasWebGLOutput) {
            canvasStyle.tileStroke = "rgba(0,0,0,0)";
        }
        renderCanvasLayer(ctx, scene, canvasStyle);
        if (webgl) {
            const clipToDisk = isHyperbolic;
            if (hasWebGLOutput) {
                syncWebGLCanvas(webgl, canvas);
                webgl.renderer.render(scene, viewport, { clipToDisk });
                if (webgl.canvas) {
                    ctx.drawImage(webgl.canvas, 0, 0, canvas.width, canvas.height);
                }
            } else {
                webgl.renderer.render(scene, viewport, { clipToDisk });
            }
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
    scene: HyperbolicScene,
    style?: CanvasTileStyle,
) {
    renderTileLayer(ctx, scene, style);
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
