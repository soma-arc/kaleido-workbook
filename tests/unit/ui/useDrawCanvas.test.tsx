import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useDrawCanvas } from "@/ui/hooks/useDrawCanvas";
import type { CanvasTextureHandle } from "@/ui/hooks/useTextureSource";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

function createHandle(): {
    handle: CanvasTextureHandle;
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
} {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    Object.defineProperty(canvas, "getBoundingClientRect", {
        value: () => ({
            width: 200,
            height: 200,
            top: 0,
            left: 0,
            bottom: 200,
            right: 200,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        }),
    });

    const context = {
        canvas,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        lineCap: "round",
        lineJoin: "round",
        globalCompositeOperation: "source-over",
        strokeStyle: "#000",
        lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    const handle: CanvasTextureHandle = {
        canvas,
        context,
        resize: vi.fn(),
    };

    return { handle, context, canvas };
}

function createPointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
    return {
        pointerId: overrides.pointerId ?? 1,
        clientX: overrides.clientX ?? 10,
        clientY: overrides.clientY ?? 10,
        preventDefault: overrides.preventDefault ?? vi.fn(),
    } as PointerEvent;
}

type HookHarness = {
    current: ReturnType<typeof useDrawCanvas>;
    cleanup: () => void;
};

function renderHook(handle: CanvasTextureHandle): HookHarness {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: ReturnType<typeof useDrawCanvas> | null = null;

    function HookWrapper(): JSX.Element | null {
        current = useDrawCanvas(handle, { devicePixelRatio: 1 });
        return null;
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
        cleanup: () => {
            act(() => {
                root.unmount();
            });
            document.body.removeChild(container);
        },
    };
}

describe("useDrawCanvas", () => {
    it("draws strokes for pointer interactions", () => {
        const { handle, context } = createHandle();
        const harness = renderHook(handle);

        act(() => {
            harness.current.handlePointerDown(createPointerEvent({ clientX: 20, clientY: 20 }));
            harness.current.handlePointerMove(createPointerEvent({ clientX: 40, clientY: 40 }));
            harness.current.handlePointerUp(createPointerEvent());
        });

        expect(context.beginPath).toHaveBeenCalled();
        expect(context.moveTo).toHaveBeenCalled();
        expect(context.lineTo).toHaveBeenCalled();
        expect(context.stroke).toHaveBeenCalled();
        harness.cleanup();
    });

    it("clears the canvas", () => {
        const { handle, context } = createHandle();
        const harness = renderHook(handle);

        act(() => {
            harness.current.clear();
        });

        expect(context.clearRect).toHaveBeenCalledWith(
            0,
            0,
            handle.canvas.width,
            handle.canvas.height,
        );
        harness.cleanup();
    });
});
