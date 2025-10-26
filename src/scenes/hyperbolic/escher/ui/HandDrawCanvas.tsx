import { useEffect, useRef } from "react";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import type { UseTextureInputResult } from "@/ui/hooks/useTextureSource";

export type HandDrawCanvasApi = {
    clear: () => void;
};

type EscherHandDrawCanvasProps = {
    containerRef: React.RefObject<HTMLDivElement>;
    textureInput: UseTextureInputResult;
    onReady?: (api: HandDrawCanvasApi | null) => void;
};

export function EscherHandDrawCanvas({
    containerRef,
    textureInput,
    onReady,
}: EscherHandDrawCanvasProps): JSX.Element | null {
    const handleRef = useRef<ReturnType<typeof textureInput.enableCanvas> | null>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const initialWidth = container.clientWidth || 512;
        const initialHeight = container.clientHeight || 512;
        const handle = textureInput.enableCanvas(TEXTURE_SLOTS.camera, {
            width: initialWidth,
            height: initialHeight,
            devicePixelRatio: dpr,
            id: "escher-hand-draw",
        });
        handleRef.current = handle;

        const canvas = handle.canvas;
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.pointerEvents = "auto";
        canvas.style.touchAction = "none";
        canvas.style.background = "transparent";
        canvas.style.cursor = "crosshair";
        container.appendChild(canvas);

        const ctx = handle.context;
        if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.lineWidth = 2 * dpr;
        }

        const toCanvasCoords = (event: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const ratio = canvas.width / rect.width;
            const x = (event.clientX - rect.left) * ratio;
            const y = (event.clientY - rect.top) * ratio;
            return { x, y };
        };

        const handlePointerDown = (event: PointerEvent) => {
            if (!ctx) return;
            const coords = toCanvasCoords(event);
            drawingRef.current = true;
            lastPointRef.current = coords;
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            canvas.setPointerCapture(event.pointerId);
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!ctx || !drawingRef.current) return;
            const coords = toCanvasCoords(event);
            const last = lastPointRef.current;
            if (!last) {
                ctx.moveTo(coords.x, coords.y);
            } else {
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
            }
            lastPointRef.current = coords;
        };

        const stopDrawing = (event: PointerEvent) => {
            if (!ctx || !drawingRef.current) return;
            drawingRef.current = false;
            lastPointRef.current = null;
            ctx.closePath();
            try {
                canvas.releasePointerCapture(event.pointerId);
            } catch {
                /* ignore */
            }
        };

        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointermove", handlePointerMove);
        canvas.addEventListener("pointerup", stopDrawing);
        canvas.addEventListener("pointercancel", stopDrawing);
        canvas.addEventListener("pointerleave", stopDrawing);

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            const rect = entry.contentRect;
            handle.resize(rect.width, rect.height);
        });
        resizeObserver.observe(container);
        resizeObserverRef.current = resizeObserver;

        const clear = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        onReady?.({ clear });

        return () => {
            onReady?.(null);
            resizeObserver.disconnect();
            canvas.removeEventListener("pointerdown", handlePointerDown);
            canvas.removeEventListener("pointermove", handlePointerMove);
            canvas.removeEventListener("pointerup", stopDrawing);
            canvas.removeEventListener("pointercancel", stopDrawing);
            canvas.removeEventListener("pointerleave", stopDrawing);
            canvas.remove();
            textureInput.disable(TEXTURE_SLOTS.camera);
        };
    }, [containerRef, textureInput, onReady]);

    return null;
}
