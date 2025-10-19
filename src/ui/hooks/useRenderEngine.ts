import { useEffect, useRef, useState } from "react";
import type { RenderEngine, RenderEngineOptions, RenderMode } from "@/render/engine";

export type UseRenderEngineOptions = {
    mode?: RenderMode;
    autoDetect?: boolean;
    enabled?: boolean;
    factory?: (canvas: HTMLCanvasElement, options: RenderEngineOptions) => RenderEngine;
    detect?: () => RenderMode;
};

function createFallbackEngine(mode: RenderMode): RenderEngine {
    return {
        render: () => {
            /* no-op */
        },
        capture: () => null,
        dispose: () => {
            /* no-op */
        },
        getMode: () => mode,
    };
}

export function useRenderEngineWithCanvas({
    mode,
    autoDetect = true,
    enabled = true,
    factory,
    detect,
}: UseRenderEngineOptions = {}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderEngineRef = useRef<RenderEngine | null>(null);
    const [renderMode, setRenderMode] = useState<RenderMode>(() => mode ?? "hybrid");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (mode) {
            setRenderMode(mode);
            return;
        }
        if (!autoDetect) {
            return;
        }
        let cancelled = false;
        const resolveRenderMode = async () => {
            try {
                const resolvedMode = detect
                    ? detect()
                    : (await import("@/render/engine")).detectRenderMode();
                if (!cancelled) {
                    setRenderMode(resolvedMode);
                }
            } catch (error) {
                console.warn("[useRenderEngineWithCanvas] detectRenderMode failed", error);
                if (!cancelled) {
                    setRenderMode("hybrid");
                }
            }
        };
        resolveRenderMode();
        return () => {
            cancelled = true;
        };
    }, [mode, autoDetect, detect]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!enabled) {
            renderEngineRef.current = null;
            setReady(false);
            return;
        }
        if (!canvas) {
            return;
        }
        let disposed = false;
        let cleanup: (() => void) | undefined;
        const initialise = async () => {
            try {
                const createEngine = factory
                    ? factory
                    : (await import("@/render/engine")).createRenderEngine;
                if (disposed) return;
                const engine = createEngine(canvas, { mode: renderMode });
                renderEngineRef.current = engine;
                setReady(true);
                cleanup = () => {
                    renderEngineRef.current = null;
                    engine.dispose();
                    setReady(false);
                };
            } catch (error) {
                console.warn("[useRenderEngineWithCanvas] failed to create render engine", error);
                if (disposed) return;
                const fallback = createFallbackEngine(renderMode);
                renderEngineRef.current = fallback;
                setReady(true);
                cleanup = () => {
                    renderEngineRef.current = null;
                    fallback.dispose();
                    setReady(false);
                };
            }
        };

        initialise();

        return () => {
            disposed = true;
            cleanup?.();
        };
    }, [renderMode, enabled, factory]);

    return { canvasRef, renderEngineRef, renderMode, ready } as const;
}
