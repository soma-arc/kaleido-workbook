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
            root.render(<>{overlay}</>);
        });
        expect(container.querySelector('[data-testid="default-controls"]')).toBeTruthy();
        const note = container.querySelector('[data-testid="camera-debug-overlay-note"]');
        expect(note?.textContent ?? "").toContain("カメラ入力を有効化");
        act(() => {
            root.unmount();
        });
        container.remove();
    });
});
