import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, describe, expect, it, vi } from "vitest";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { type CanvasTextureHandle, useTextureInput } from "@/ui/hooks/useTextureSource";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useTextureInput>;

type HookHarness = {
    current: HookResult;
    update: (callback: (result: HookResult) => void) => void;
    cleanup: () => void;
};

function renderHook(): HookHarness {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: HookResult | null = null;

    function HookWrapper(): JSX.Element | null {
        current = useTextureInput();
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
        update: (callback) => {
            act(() => {
                if (!current) {
                    throw new Error("Hook result unavailable");
                }
                callback(current);
            });
        },
        cleanup: () => {
            act(() => {
                root.unmount();
            });
            document.body.removeChild(container);
        },
    };
}

const getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement) {
        const context: Partial<CanvasRenderingContext2D> = {
            canvas: this,
            lineCap: "round",
            lineJoin: "round",
        };
        return context as CanvasRenderingContext2D;
    });

afterAll(() => {
    getContextSpy.mockRestore();
});

describe("useTextureInput canvas sources", () => {
    it("enables a canvas texture for the base slot", () => {
        const harness = renderHook();
        const handle: CanvasTextureHandle = (() => {
            let currentHandle: CanvasTextureHandle | null = null;
            harness.update((state) => {
                currentHandle = state.enableCanvas(TEXTURE_SLOTS.base, {
                    width: 256,
                    height: 128,
                    devicePixelRatio: 1,
                });
            });
            if (!currentHandle) {
                throw new Error("enableCanvas did not return a handle");
            }
            return currentHandle;
        })();
        expect(handle.canvas).toBeInstanceOf(HTMLCanvasElement);
        expect(handle.canvas.width).toBe(256);
        expect(handle.canvas.height).toBe(128);
        expect(harness.current.slots[TEXTURE_SLOTS.base].status).toBe("ready");
        const layer = harness.current.slots[TEXTURE_SLOTS.base].layer;
        expect(layer?.kind).toBe("canvas");
        expect(layer?.source).not.toBeNull();
        expect(layer?.source?.kind).toBe("canvas");
        act(() => {
            handle.resize(300, 150);
        });
        expect(handle.canvas.width).toBe(300);
        expect(handle.canvas.height).toBe(150);
        harness.cleanup();
    });

    it("disables the canvas texture when requested", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.enableCanvas(TEXTURE_SLOTS.base, { devicePixelRatio: 1 });
        });
        expect(harness.current.slots[TEXTURE_SLOTS.base].layer).not.toBeNull();
        harness.update((state) => {
            state.disable(TEXTURE_SLOTS.base);
        });
        expect(harness.current.slots[TEXTURE_SLOTS.base].layer).toBeNull();
        expect(harness.current.slots[TEXTURE_SLOTS.base].status).toBe("idle");
        harness.cleanup();
    });
});
