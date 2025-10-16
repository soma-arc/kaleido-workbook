import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { getSceneDefinition, SCENE_IDS } from "@/ui/scenes";
import type { SceneEmbedOverlayContext } from "@/ui/scenes/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("sceneDefinitions embed overlay factory", () => {
    it("decorates controls for the camera debug scene", () => {
        const scene = getSceneDefinition(SCENE_IDS.euclideanCameraDebug);
        expect(scene.embedOverlayFactory).toBeTruthy();
        const controls = <div data-testid="default-controls">Default</div>;
        const context: SceneEmbedOverlayContext = {
            scene,
            renderBackend: "hybrid",
            controls,
        };
        const overlay = scene.embedOverlayFactory?.(context);
        expect(overlay).toBeTruthy();
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        act(() => {
            root.render(overlay ?? null);
        });
        expect(container.querySelector('[data-testid="default-controls"]')).toBeTruthy();
        const note = container.querySelector('[data-testid="camera-debug-overlay-note"]');
        expect(note?.textContent ?? "").toContain("カメラ入力を有効化");
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("provides multi-plane slider for the multi-plane scene", () => {
        const scene = getSceneDefinition(SCENE_IDS.euclideanMultiPlane);
        expect(scene.embedOverlayFactory).toBeTruthy();
        const onChange = vi.fn();
        const defaultControls = <div data-testid="default-controls">Toggle</div>;
        const overlay = scene.embedOverlayFactory?.({
            scene,
            renderBackend: "hybrid",
            controls: defaultControls,
            extras: {
                multiPlaneControls: {
                    minSides: 3,
                    maxSides: 20,
                    value: 6,
                    onChange,
                },
            },
        });
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        act(() => {
            root.render(overlay ?? null);
        });
        const input = container.querySelector<HTMLInputElement>("input[type=range]");
        expect(input).toBeTruthy();
        expect(container.querySelector('[data-testid="default-controls"]')).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
        onChange(7);
        expect(onChange).toHaveBeenCalledWith(7);
        act(() => {
            root.unmount();
        });
        container.remove();
    });
});
