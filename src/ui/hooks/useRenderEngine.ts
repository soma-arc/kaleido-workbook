import { useEffect, useRef, useState } from "react";
import type { RenderEngine, RenderMode } from "@/render/engine";

export type UseRenderEngineOptions = {
    mode?: RenderMode;
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

export function useRenderEngineWithCanvas({ mode }: UseRenderEngineOptions = {}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderEngineRef = useRef<RenderEngine | null>(null);
    const [renderMode, setRenderMode] = useState<RenderMode>(() => mode ?? "hybrid");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (mode) {
            setRenderMode(mode);
            return;
        }
        let cancelled = false;
        import("@/render/engine")
            .then((module) => {
                if (cancelled) return;
                setRenderMode(module.detectRenderMode());
            })
            .catch((error) => {
                console.warn("[useRenderEngineWithCanvas] detectRenderMode failed", error);
                if (!cancelled) {
                    setRenderMode("hybrid");
                }
            });
        return () => {
            cancelled = true;
        };
    }, [mode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let disposed = false;
        let cleanup: (() => void) | undefined;
        const initialise = async () => {
            try {
                const { createRenderEngine } = await import("@/render/engine");
                if (disposed) return;
                const engine = createRenderEngine(canvas, { mode: renderMode });
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
    }, [renderMode]);

    return { canvasRef, renderEngineRef, renderMode, ready } as const;
}
