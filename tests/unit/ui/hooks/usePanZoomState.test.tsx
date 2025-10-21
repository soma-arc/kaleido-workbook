import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import type { Viewport } from "@/render/viewport";
import { usePanZoomState } from "@/ui/hooks/usePanZoomState";

type HookResult = ReturnType<typeof usePanZoomState>;

type HookHarness = {
    current: HookResult;
    canvas: HTMLCanvasElement;
    cleanup: () => void;
};

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

function renderHook(options?: {
    baseViewport?: Viewport;
    minScale?: number;
    maxScale?: number;
}): HookHarness {
    const base = options?.baseViewport ?? { scale: 5, tx: 100, ty: 100 };
    const limits = {
        minScale: options?.minScale ?? 0.25,
        maxScale: options?.maxScale ?? 8,
    };
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: HookResult | null = null;

    function HookWrapper(): JSX.Element {
        current = usePanZoomState(() => base, limits);
        return <span />;
    }

    act(() => {
        root.render(<HookWrapper />);
    });

    if (!current) {
        throw new Error("Hook did not initialize");
    }

    return {
        get current() {
            if (!current) {
                throw new Error("Hook result unavailable");
            }
            return current;
        },
        canvas,
        cleanup: () => {
            act(() => {
                root.unmount();
            });
            document.body.removeChild(container);
        },
    };
}

describe("usePanZoomState", () => {
    it("returns base viewport when untouched", () => {
        const harness = renderHook({ baseViewport: { scale: 4, tx: 160, ty: 120 } });
        const viewport = harness.current.getViewport(harness.canvas);
        expect(viewport).toEqual({ scale: 4, tx: 160, ty: 120 });
        harness.cleanup();
    });

    it("adjusts translation after panBy", () => {
        const harness = renderHook({ baseViewport: { scale: 6, tx: 200, ty: 200 } });
        act(() => {
            harness.current.getViewport(harness.canvas);
            harness.current.panBy(32, -18);
        });
        const viewport = harness.current.getViewport(harness.canvas);
        expect(viewport.scale).toBe(6);
        expect(viewport.tx).toBe(232);
        expect(viewport.ty).toBe(182);
        harness.cleanup();
    });

    it("zooms around a focus point and clamps scale", () => {
        const harness = renderHook({ baseViewport: { scale: 5, tx: 100, ty: 100 }, maxScale: 2 });
        const focus = { x: 140, y: 80 };
        act(() => {
            harness.current.getViewport(harness.canvas);
            harness.current.zoomAt(focus, 10);
        });
        const viewport = harness.current.getViewport(harness.canvas);
        // maxScale = 2 => final scale = base.scale * 2
        expect(viewport.scale).toBeCloseTo(10);
        // Translation follows focus-preserving formula
        expect(viewport.tx).toBeCloseTo(60);
        expect(viewport.ty).toBeCloseTo(120);
        harness.cleanup();
    });

    it("reset restores the initial viewport", () => {
        const harness = renderHook({ baseViewport: { scale: 3, tx: 90, ty: 70 } });
        act(() => {
            harness.current.getViewport(harness.canvas);
            harness.current.panBy(50, 10);
            harness.current.zoomAt({ x: 120, y: 80 }, 0.5);
            harness.current.reset();
        });
        const viewport = harness.current.getViewport(harness.canvas);
        expect(viewport).toEqual({ scale: 3, tx: 90, ty: 70 });
        harness.cleanup();
    });
});
