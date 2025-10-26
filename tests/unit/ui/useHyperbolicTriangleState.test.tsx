import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
    type UseHyperbolicTriangleStateOptions,
    useHyperbolicTriangleState,
} from "../../../src/ui/hooks/useHyperbolicTriangleState";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useHyperbolicTriangleState>;

type HookHarness = {
    current: HookResult;
    update: (callback: (result: HookResult) => void) => void;
    cleanup: () => void;
};

const DEFAULT_OPTIONS: UseHyperbolicTriangleStateOptions = {
    initialParams: { p: 3, q: 3, r: 7, depth: 2 },
    triangleNMax: 100,
    depthRange: { min: 0, max: 10 },
};

function renderHook(options?: Partial<UseHyperbolicTriangleStateOptions>): HookHarness {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: HookResult | null = null;

    function HookWrapper({ opts }: { opts: UseHyperbolicTriangleStateOptions }) {
        current = useHyperbolicTriangleState(opts);
        return null;
    }

    const merged: UseHyperbolicTriangleStateOptions = { ...DEFAULT_OPTIONS, ...options };
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

describe("useHyperbolicTriangleState", () => {
    it("updates params via applyDirectTriple and clamps to hyperbolic regime", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.applyDirectTriple({ p: 3, q: 3, r: 5 });
        });
        expect(harness.current.params).toMatchObject({ p: 3, q: 3, r: 5 });
        harness.update((state) => {
            state.applyDirectTriple({ p: 3, q: 3, r: 2 });
        });
        expect(harness.current.params.r).toBeGreaterThan(3);
        harness.cleanup();
    });

    it("exposes slider metadata aligned with snap toggle", () => {
        const harness = renderHook();
        expect(harness.current.snapEnabled).toBe(true);
        expect(harness.current.rStep).toBe(1);
        harness.update((state) => {
            state.setSnapEnabled(false);
        });
        expect(harness.current.snapEnabled).toBe(false);
        expect(harness.current.rStep).toBeCloseTo(0.1);
        harness.cleanup();
    });

    it("normalizes depth updates", () => {
        const harness = renderHook();
        harness.update((state) => {
            state.updateDepth(4.7);
        });
        expect(harness.current.params.depth).toBe(5);
        harness.cleanup();
    });
});
