import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import type { TrianglePreset } from "../../../src/ui/hooks/useTriangleParams";
import {
    type UseTriangleParamsOptions,
    useTriangleParams,
} from "../../../src/ui/hooks/useTriangleParams";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useTriangleParams>;

type HookHarness = {
    current: HookResult;
    update: (callback: (result: HookResult) => void) => void;
    cleanup: () => void;
};

const DEFAULT_OPTIONS: UseTriangleParamsOptions = {
    initialParams: { p: 2, q: 3, r: 7, depth: 2 },
    triangleNMax: 100,
    depthRange: { min: 0, max: 10 },
};

function renderHook(options?: Partial<UseTriangleParamsOptions>): HookHarness {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: HookResult | null = null;

    function HookWrapper({ opts }: { opts: UseTriangleParamsOptions }) {
        current = useTriangleParams(opts);
        return null;
    }

    const merged: UseTriangleParamsOptions = { ...DEFAULT_OPTIONS, ...options };
    act(() => {
        root.render(<HookWrapper opts={merged} />);
    });

    if (!current) {
        throw new Error("Hook did not initialize");
    }

    return {
        get current() {
            if (!current) throw new Error("Hook result unavailable");
            return current;
        },
        update: (callback) => {
            act(() => {
                if (!current) throw new Error("Hook result unavailable");
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

describe("useTriangleParams", () => {
    it("updates parameters when inputs change", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.clearAnchor();
        });
        harness.update((state) => {
            state.setParamInput("p", "3");
            state.setParamInput("q", "7");
            state.setParamInput("r", "9");
        });
        expect(harness.current.params).toMatchObject({ p: 3, q: 7, r: 9 });
        harness.cleanup();
    });

    it("locks p and q when anchor is set", () => {
        const harness = renderHook();
        const preset: TrianglePreset = { label: "(3,3,3)", p: 3, q: 3, r: 3 };
        harness.update((state) => {
            state.setFromPreset(preset);
            state.setParamInput("p", "5");
        });
        expect(harness.current.formInputs.p).toBe("3");
        harness.cleanup();
    });

    it("emits validation errors when snap is disabled and the triple is not hyperbolic", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.clearAnchor();
        });
        harness.update((state) => {
            state.setSnapEnabled(false);
            state.setParamInput("p", "2");
            state.setParamInput("q", "2");
            state.setParamInput("r", "2");
        });
        expect(harness.current.paramError).toContain("must be < 1");
        harness.cleanup();
    });

    it("uses fractional step when snap is disabled", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.setSnapEnabled(false);
        });
        expect(harness.current.rStep).toBeCloseTo(0.1);
        harness.cleanup();
    });

    it("normalizes depth updates", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.updateDepth(4.6);
        });
        expect(harness.current.params.depth).toBe(5);
        harness.cleanup();
    });

    it("switches to Euclidean preset when mode changes", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.setGeometryMode("euclidean");
        });
        expect(harness.current.geometryMode).toBe("euclidean");
        expect(harness.current.formInputs).toMatchObject({ p: "3", q: "3", r: "3" });
        harness.cleanup();
    });
});
