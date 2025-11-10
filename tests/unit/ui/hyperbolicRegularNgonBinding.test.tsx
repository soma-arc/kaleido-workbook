import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
    HYPERBOLIC_REGULAR_NGON_SCENE_ID,
    hyperbolicRegularNgonScene,
} from "@/scenes/hyperbolic/regular-ngon";
import type { HyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import { useHyperbolicBindingForScene } from "@/ui/scenes/hyperbolicBindings";
import type { SceneDefinition } from "@/ui/scenes/types";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

const mockTriangleState: HyperbolicTriangleState = {
    params: { p: 3, q: 3, r: 7, depth: 2 },
    snapEnabled: true,
    setSnapEnabled: () => undefined,
    rRange: { min: 3, max: 9 },
    rSliderValue: 7,
    rStep: 1,
    applyDirectTriple: () => undefined,
    updateDepth: () => undefined,
    idealVertexEnabled: false,
    setIdealVertex: () => undefined,
};

type HookHarness = {
    current: ReturnType<typeof useHyperbolicBindingForScene>;
    update: (fn: (value: ReturnType<typeof useHyperbolicBindingForScene>) => void) => void;
    cleanup: () => void;
};

function renderHook(scene: SceneDefinition): HookHarness {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current: ReturnType<typeof useHyperbolicBindingForScene> | null = null;

    function HookWrapper() {
        current = useHyperbolicBindingForScene(scene, {
            scene,
            triangle: mockTriangleState,
            sliderId: "regular-ngon",
            triangleSliderId: "triangle",
            createId: (suffix) => `regular-ngon-${suffix}`,
        });
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
            if (!current) throw new Error("Hook result unavailable");
            return current;
        },
        update: (fn) => {
            act(() => {
                if (!current) throw new Error("Hook result unavailable");
                fn(current);
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

const sceneDefinition: SceneDefinition = {
    ...hyperbolicRegularNgonScene,
    id: HYPERBOLIC_REGULAR_NGON_SCENE_ID,
};

describe("hyperbolic regular n-gon binding", () => {
    it("produces regularNgon params when valid", () => {
        const harness = renderHook(sceneDefinition);
        expect(harness.current.paramsOverride).toMatchObject({ kind: "regularNgon" });
        expect(harness.current.suspendRender).toBe(false);
        harness.cleanup();
    });

    it("suspends rendering when the hyperbolic condition fails", () => {
        const harness = renderHook(sceneDefinition);
        harness.update((binding) => {
            const overlay = binding.overlayExtras as {
                regularNgonOverlay?: {
                    nSlider: { onChange: (next: number) => void };
                    qSlider: { onChange: (next: number) => void };
                };
            };
            overlay?.regularNgonOverlay?.nSlider.onChange(4);
            overlay?.regularNgonOverlay?.qSlider.onChange(3);
        });
        expect(harness.current.suspendRender).toBe(true);
        expect(harness.current.paramsOverride).toBeUndefined();
        harness.cleanup();
    });
});
