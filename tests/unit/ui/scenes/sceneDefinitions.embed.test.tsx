import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { getSceneDefinition, SCENE_IDS } from "@/ui/scenes";
import type { SceneEmbedOverlayContext } from "@/ui/scenes/types";
import { getPresetGroupsForGeometry } from "@/ui/trianglePresets";

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

    it("provides half-plane presets and toggles for the Euclidean half-planes scene", () => {
        const scene = getSceneDefinition(SCENE_IDS.euclideanHalfPlanes);
        expect(scene.embedOverlayFactory).toBeTruthy();
        const controls = <div data-testid="default-controls">Default</div>;
        const groups = getPresetGroupsForGeometry(scene.geometry);
        const selectPreset = vi.fn();
        const toggleHandles = vi.fn();
        const setSnapEnabled = vi.fn();
        const context: SceneEmbedOverlayContext = {
            scene,
            renderBackend: "hybrid",
            controls,
            extras: {
                showHandles: true,
                toggleHandles,
                halfPlaneControls: {
                    presetGroups: groups,
                    activePresetId: "euc-333",
                    selectPreset,
                    snapEnabled: true,
                    setSnapEnabled,
                },
            },
        };
        const overlay = scene.embedOverlayFactory?.(context);
        expect(overlay).toBeTruthy();
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        act(() => {
            root.render(overlay ?? null);
        });
        const presetButton = container.querySelector('button[data-preset-id="euc-244"]');
        act(() => {
            presetButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
        expect(selectPreset).toHaveBeenCalledOnce();
        const snapCheckbox = container.querySelector(
            'input[type="checkbox"]',
        ) as HTMLInputElement | null;
        expect(snapCheckbox).toBeTruthy();
        if (snapCheckbox) {
            act(() => {
                snapCheckbox.click();
            });
        }
        expect(setSnapEnabled).toHaveBeenCalled();
        const handleToggle = container.querySelector(
            '[data-testid="embed-overlay-euclidean-toggle"]',
        );
        act(() => {
            handleToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
        expect(toggleHandles).toHaveBeenCalled();
        act(() => {
            root.unmount();
        });
        container.remove();
    });
});
