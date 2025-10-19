import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import type { RenderEngine, RenderMode } from "@/render/engine";
import { type UseRenderEngineOptions, useRenderEngineWithCanvas } from "@/ui/hooks/useRenderEngine";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useRenderEngineWithCanvas>;

type HookHarness = {
    current: HookResult;
    rerender: (options: UseRenderEngineOptions) => void;
    cleanup: () => void;
};

function renderHook(options: UseRenderEngineOptions): HookHarness {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: HookResult | null = null;

    function HookWrapper(props: { hookOptions: UseRenderEngineOptions }): JSX.Element {
        current = useRenderEngineWithCanvas(props.hookOptions);
        return <canvas ref={current.canvasRef} />;
    }

    act(() => {
        root.render(<HookWrapper hookOptions={options} />);
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
        rerender: (nextOptions) => {
            act(() => {
                root.render(<HookWrapper hookOptions={nextOptions} />);
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

function createMockEngine(mode: RenderMode): RenderEngine {
    return {
        render: vi.fn(),
        capture: vi.fn().mockReturnValue(null),
        dispose: vi.fn(),
        getMode: vi.fn(() => mode),
    };
}

describe("useRenderEngineWithCanvas options", () => {
    it("does not create an engine when disabled", () => {
        const factory = vi.fn(() => createMockEngine("hybrid"));
        const harness = renderHook({ enabled: false, factory });
        expect(factory).not.toHaveBeenCalled();
        expect(harness.current.ready).toBe(false);
        expect(harness.current.renderEngineRef.current).toBeNull();
        harness.cleanup();
    });

    it("uses the provided factory when enabled", () => {
        const factory = vi.fn(() => createMockEngine("hybrid"));
        const harness = renderHook({ enabled: true, factory });
        expect(factory).toHaveBeenCalledTimes(1);
        expect(harness.current.ready).toBe(true);
        expect(harness.current.renderEngineRef.current).not.toBeNull();
        harness.cleanup();
    });

    it("skips auto detection when disabled", () => {
        const detect = vi.fn(() => "canvas" as RenderMode);
        const factory = vi.fn(() => createMockEngine("canvas"));
        const harness = renderHook({ autoDetect: false, detect, factory });
        expect(detect).not.toHaveBeenCalled();
        expect(harness.current.renderMode).toBe("hybrid");
        harness.cleanup();
    });

    it("uses custom detect implementation when autoDetect is enabled", () => {
        const detect = vi.fn(() => "canvas" as RenderMode);
        const factory = vi.fn(() => createMockEngine("canvas"));
        const harness = renderHook({ autoDetect: true, detect, factory });
        expect(detect).toHaveBeenCalledTimes(1);
        expect(harness.current.renderMode).toBe("canvas");
        harness.cleanup();
    });
});
