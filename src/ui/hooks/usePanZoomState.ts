import type { MutableRefObject } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Viewport } from "@/render/viewport";

export type PanZoomModifier = {
    scale: number;
    offsetX: number;
    offsetY: number;
};

export type PanZoomOptions = {
    minScale?: number;
    maxScale?: number;
};

const IDENTITY_VIEWPORT: Viewport = { scale: 1, tx: 0, ty: 0 };

function clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function combineViewport(base: Viewport, modifier: PanZoomModifier): Viewport {
    return {
        scale: base.scale * modifier.scale,
        tx: base.tx + modifier.offsetX,
        ty: base.ty + modifier.offsetY,
    };
}

export interface PanZoomState {
    /**
     * 現在の pan/zoom モディファイア。依存配列に利用できる。
     */
    modifier: PanZoomModifier;
    /**
     * 最新の pan/zoom モディファイアを保持する参照。
     * 同期的な読み取りが必要なときに利用する。
     */
    modifierRef: MutableRefObject<PanZoomModifier>;
    /**
     * キャンバスの現在の基準 viewport を元に pan/zoom を適用した viewport を返す。
     * この呼び出しによって内部で利用する基準 viewport が更新される。
     */
    getViewport(canvas: HTMLCanvasElement): Viewport;
    /**
     * ピクセル単位の平行移動を適用する。
     */
    panBy(deltaX: number, deltaY: number): void;
    /**
     * ズーム操作を適用する。focus はキャンバスピクセル座標、factor は倍率。
     */
    zoomAt(focus: { x: number; y: number }, factor: number): void;
    /**
     * pan/zoom をリセットする。
     */
    reset(): void;
}

export function usePanZoomState(
    computeBaseViewport: (canvas: HTMLCanvasElement) => Viewport,
    options: PanZoomOptions = {},
): PanZoomState {
    const minScale = options.minScale ?? 0.2;
    const maxScale = options.maxScale ?? 8;
    const [modifier, setModifierState] = useState<PanZoomModifier>({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
    });
    const baseViewportRef = useRef<Viewport>(IDENTITY_VIEWPORT);
    const modifierRef = useRef<PanZoomModifier>(modifier);

    const setModifier = useCallback((next: PanZoomModifier) => {
        modifierRef.current = next;
        setModifierState(next);
    }, []);

    const getViewport = useCallback(
        (canvas: HTMLCanvasElement) => {
            const base = computeBaseViewport(canvas);
            baseViewportRef.current = base;
            return combineViewport(base, modifierRef.current);
        },
        [computeBaseViewport],
    );

    const panBy = useCallback(
        (deltaX: number, deltaY: number) => {
            const prev = modifierRef.current;
            setModifier({
                scale: prev.scale,
                offsetX: prev.offsetX + deltaX,
                offsetY: prev.offsetY + deltaY,
            });
        },
        [setModifier],
    );

    const zoomAt = useCallback(
        (focus: { x: number; y: number }, factor: number) => {
            if (!(factor > 0) || Number.isNaN(factor)) {
                return;
            }
            const prev = modifierRef.current;
            const base = baseViewportRef.current ?? IDENTITY_VIEWPORT;
            const prevViewport = combineViewport(base, prev);
            const nextScale = clamp(prev.scale * factor, minScale, maxScale);
            const appliedFactor = nextScale / prev.scale;
            const nextTx = focus.x - (focus.x - prevViewport.tx) * appliedFactor;
            const nextTy = focus.y + (prevViewport.ty - focus.y) * appliedFactor;
            setModifier({
                scale: nextScale,
                offsetX: nextTx - base.tx,
                offsetY: nextTy - base.ty,
            });
        },
        [maxScale, minScale, setModifier],
    );

    const reset = useCallback(() => {
        setModifier({
            scale: 1,
            offsetX: 0,
            offsetY: 0,
        });
    }, [setModifier]);

    return useMemo(
        () => ({
            modifier,
            modifierRef,
            getViewport,
            panBy,
            zoomAt,
            reset,
        }),
        [modifier, getViewport, panBy, zoomAt, reset],
    );
}
