import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasTextureHandle } from "./useTextureSource";

export type DrawBrushMode = "draw" | "erase";

export type DrawBrushState = {
    color: string;
    size: number;
    mode: DrawBrushMode;
};

export type UseDrawCanvasOptions = {
    devicePixelRatio?: number;
};

export type UseDrawCanvasResult = {
    brush: DrawBrushState;
    setBrushColor: (color: string) => void;
    setBrushSize: (size: number) => void;
    setBrushMode: (mode: DrawBrushMode) => void;
    clear: () => void;
    handlePointerDown: (event: PointerEvent) => void;
    handlePointerMove: (event: PointerEvent) => void;
    handlePointerUp: (event: PointerEvent) => void;
};

function getDevicePixelRatio(fallback = 1): number {
    if (typeof window === "undefined") return fallback;
    return window.devicePixelRatio || fallback;
}

export function useDrawCanvas(
    handle: CanvasTextureHandle | null,
    options: UseDrawCanvasOptions = {},
): UseDrawCanvasResult {
    const pointerState = useRef<Map<number, { x: number; y: number }>>(new Map());
    const dpr = options.devicePixelRatio ?? getDevicePixelRatio();
    const [brush, setBrush] = useState<DrawBrushState>(() => ({
        color: "#1f2933",
        size: 12,
        mode: "draw",
    }));

    const getPoint = useCallback(
        (event: PointerEvent) => {
            const canvas = handle?.canvas;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const scaleX = rect.width > 0 ? canvas.width / rect.width : dpr;
            const scaleY = rect.height > 0 ? canvas.height / rect.height : dpr;
            return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY,
            };
        },
        [handle, dpr],
    );

    const drawStroke = useCallback(
        (from: { x: number; y: number }, to: { x: number; y: number }) => {
            const context = handle?.context;
            if (!context) return;
            context.save();
            context.lineCap = "round";
            context.lineJoin = "round";
            context.globalCompositeOperation =
                brush.mode === "erase" ? "destination-out" : "source-over";
            context.strokeStyle = brush.color;
            context.lineWidth = Math.max(0.01, brush.size) * dpr;
            context.beginPath();
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.stroke();
            context.restore();
        },
        [brush.color, brush.mode, brush.size, dpr, handle],
    );

    const drawPoint = useCallback(
        (point: { x: number; y: number }) => {
            drawStroke(point, point);
        },
        [drawStroke],
    );

    const handlePointerDown = useCallback(
        (event: PointerEvent) => {
            if (!handle?.canvas) return;
            const point = getPoint(event);
            if (!point) return;
            event.preventDefault();
            try {
                handle.canvas.setPointerCapture(event.pointerId);
            } catch {
                // Ignore when pointer capture is unsupported.
            }
            pointerState.current.set(event.pointerId, point);
            drawPoint(point);
        },
        [drawPoint, getPoint, handle],
    );

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            const previous = pointerState.current.get(event.pointerId);
            if (!previous) return;
            const next = getPoint(event);
            if (!next) return;
            event.preventDefault();
            drawStroke(previous, next);
            pointerState.current.set(event.pointerId, next);
        },
        [drawStroke, getPoint],
    );

    const releasePointer = useCallback((pointerId: number) => {
        pointerState.current.delete(pointerId);
    }, []);

    const handlePointerUp = useCallback(
        (event: PointerEvent) => {
            if (handle?.canvas) {
                try {
                    handle.canvas.releasePointerCapture(event.pointerId);
                } catch {
                    // Ignore: pointer capture might not be active.
                }
            }
            releasePointer(event.pointerId);
        },
        [handle, releasePointer],
    );

    const clear = useCallback(() => {
        const canvas = handle?.canvas;
        const context = handle?.context;
        if (!canvas || !context) return;
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "source-over";
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.restore();
    }, [handle]);

    useEffect(() => {
        return () => {
            pointerState.current.clear();
        };
    }, []);

    const setBrushColor = useCallback((color: string) => {
        setBrush((prev) => ({ ...prev, color }));
    }, []);

    const setBrushSize = useCallback((size: number) => {
        setBrush((prev) => ({ ...prev, size }));
    }, []);

    const setBrushMode = useCallback((mode: DrawBrushMode) => {
        setBrush((prev) => ({ ...prev, mode }));
    }, []);

    return useMemo(
        () => ({
            brush,
            setBrushColor,
            setBrushSize,
            setBrushMode,
            clear,
            handlePointerDown,
            handlePointerMove,
            handlePointerUp,
        }),
        [
            brush,
            clear,
            handlePointerDown,
            handlePointerMove,
            handlePointerUp,
            setBrushColor,
            setBrushMode,
            setBrushSize,
        ],
    );
}
