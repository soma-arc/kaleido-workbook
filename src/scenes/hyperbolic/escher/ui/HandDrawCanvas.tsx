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
    const onReadyRef = useRef(onReady);

    // textureInputのメソッドを安定した参照として保持
    const enableCanvasRef = useRef(textureInput.enableCanvas);
    const disableRef = useRef(textureInput.disable);

    useEffect(() => {
        enableCanvasRef.current = textureInput.enableCanvas;
        disableRef.current = textureInput.disable;
    });

    // onReadyの最新値をrefに保持
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const initialWidth = container.clientWidth || 512;
        const initialHeight = container.clientHeight || 512;
        const handle = enableCanvasRef.current(TEXTURE_SLOTS.camera, {
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
        canvas.style.cursor = "crosshair";
        // キャンバスは非表示（WebGLテクスチャとして使用するのみ）
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "auto"; // イベントは受け取る
        container.appendChild(canvas);

        // handle.contextではなく、canvas要素から直接コンテキストを取得
        const ctx = canvas.getContext("2d");

        // コンテキスト設定を関数化（resize後に再適用するため）
        const applyContextSettings = () => {
            if (!ctx) return;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "rgb(255, 255, 255)";
            ctx.lineWidth = 4 * dpr;
        };

        if (ctx) {
            // コンテキスト設定を適用
            applyContextSettings();
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
            canvas.setPointerCapture(event.pointerId);
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!ctx || !drawingRef.current) return;
            const coords = toCanvasCoords(event);
            const last = lastPointRef.current;
            if (last) {
                // 前の点から現在の点まで線を引く
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
            }
            lastPointRef.current = coords;
        };

        const stopDrawing = (event: PointerEvent) => {
            if (!ctx || !drawingRef.current) return;
            drawingRef.current = false;
            lastPointRef.current = null;
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
            // リサイズ後、コンテキスト状態が初期化されるので再設定
            applyContextSettings();
        });
        resizeObserver.observe(container);
        resizeObserverRef.current = resizeObserver;

        const clear = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        onReadyRef.current?.({ clear });

        return () => {
            onReadyRef.current?.(null);
            resizeObserver.disconnect();
            canvas.removeEventListener("pointerdown", handlePointerDown);
            canvas.removeEventListener("pointermove", handlePointerMove);
            canvas.removeEventListener("pointerup", stopDrawing);
            canvas.removeEventListener("pointercancel", stopDrawing);
            canvas.removeEventListener("pointerleave", stopDrawing);
            canvas.remove();
            disableRef.current(TEXTURE_SLOTS.camera);
        };
    }, [containerRef]);

    return null;
}
