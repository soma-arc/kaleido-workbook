import { useEffect, useMemo, useRef, useState } from "react";
import { TEXTURE_SLOTS, type TextureSlot } from "@/render/webgl/textures";
import { type DrawBrushMode, useDrawCanvas } from "@/ui/hooks/useDrawCanvas";
import type { CanvasTextureHandle, UseTextureInputResult } from "@/ui/hooks/useTextureSource";

export type TextureDrawCanvasProps = {
    textureInput: UseTextureInputResult;
    slot?: TextureSlot;
    width?: number;
    height?: number;
    devicePixelRatio?: number;
    className?: string;
};

const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 512;

/**
 * Interactive canvas component dedicated to hand-drawn texture input.
 */
export function TextureDrawCanvas({
    textureInput,
    slot = TEXTURE_SLOTS.base,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    devicePixelRatio,
    className,
}: TextureDrawCanvasProps): JSX.Element {
    const [canvasHandle, setCanvasHandle] = useState<CanvasTextureHandle | null>(null);

    const { enableCanvas, disable } = textureInput;

    useEffect(() => {
        const nextHandle = enableCanvas(slot, {
            width,
            height,
            devicePixelRatio,
        });
        setCanvasHandle(nextHandle);
        return () => {
            disable(slot);
            setCanvasHandle(null);
        };
    }, [disable, enableCanvas, slot, width, height, devicePixelRatio]);

    useEffect(() => {
        if (canvasHandle) {
            canvasHandle.resize(width, height);
        }
    }, [canvasHandle, height, width]);

    const draw = useDrawCanvas(canvasHandle, { devicePixelRatio });
    const { handlePointerDown, handlePointerMove, handlePointerUp } = draw;

    const canvasContainerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const container = canvasContainerRef.current;
        const canvas = canvasHandle?.canvas;
        if (!container || !canvas) {
            return;
        }
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.style.touchAction = "none";
        if (!container.contains(canvas)) {
            container.innerHTML = "";
            container.appendChild(canvas);
        }
        const onPointerDown = (event: PointerEvent) => handlePointerDown(event);
        const onPointerMove = (event: PointerEvent) => handlePointerMove(event);
        const onPointerUp = (event: PointerEvent) => handlePointerUp(event);
        canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        canvas.addEventListener("pointermove", onPointerMove, { passive: false });
        canvas.addEventListener("pointerup", onPointerUp, { passive: false });
        canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("pointercancel", onPointerUp);
        };
    }, [canvasHandle, handlePointerDown, handlePointerMove, handlePointerUp, height, width]);

    const brushSummary = useMemo(
        () => ({
            color: draw.brush.color,
            size: draw.brush.size,
            mode: draw.brush.mode,
        }),
        [draw.brush.color, draw.brush.mode, draw.brush.size],
    );

    const toggleMode = () => {
        const nextMode: DrawBrushMode = brushSummary.mode === "draw" ? "erase" : "draw";
        draw.setBrushMode(nextMode);
    };

    return (
        <div className={className} style={{ display: "grid", gap: "12px" }}>
            <div
                ref={canvasContainerRef}
                style={{
                    width,
                    height,
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                    background: "#ffffff",
                    touchAction: "none",
                }}
                data-testid="texture-draw-canvas"
            />
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#475569" }}>色</span>
                    <input
                        type="color"
                        value={brushSummary.color}
                        onChange={(event) => draw.setBrushColor(event.target.value)}
                        aria-label="ブラシの色"
                    />
                </label>
                <label
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        flexGrow: 1,
                        maxWidth: "160px",
                    }}
                >
                    <span style={{ fontSize: "0.75rem", color: "#475569" }}>太さ</span>
                    <input
                        type="range"
                        min={1}
                        max={64}
                        value={brushSummary.size}
                        onChange={(event) => draw.setBrushSize(Number(event.target.value))}
                        aria-label="ブラシの太さ"
                    />
                </label>
                <button
                    type="button"
                    onClick={toggleMode}
                    aria-label="描画モード切り替え"
                    style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: brushSummary.mode === "erase" ? "#f8fafc" : "#e0f2fe",
                        cursor: "pointer",
                    }}
                >
                    {brushSummary.mode === "erase" ? "消しゴム" : "描画"}
                </button>
                <button
                    type="button"
                    onClick={draw.clear}
                    aria-label="キャンバスをクリア"
                    style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #f87171",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        cursor: "pointer",
                    }}
                >
                    クリア
                </button>
            </div>
            <pre
                data-testid="draw-canvas-state"
                style={{
                    margin: 0,
                    padding: "8px",
                    borderRadius: "6px",
                    background: "#f8fafc",
                    fontSize: "0.7rem",
                    overflowX: "auto",
                }}
            >
                {JSON.stringify(brushSummary, null, 2)}
            </pre>
        </div>
    );
}
