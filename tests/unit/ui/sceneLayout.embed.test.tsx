import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { GEOMETRY_KIND } from "@/geom/core/types";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import {
    createDefaultEmbedOverlay,
    resolveSceneControls,
    resolveSceneEmbedOverlay,
    SceneLayout,
} from "@/ui/scenes/layouts";
import type { SceneDefinition } from "@/ui/scenes/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderSceneLayout(props: Parameters<typeof SceneLayout>[0]) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
        root.render(<SceneLayout {...props} />);
    });
    return {
        container,
        cleanup: () => {
            act(() => {
                root.unmount();
            });
            container.remove();
        },
    };
}

describe("SceneLayout (embed overlays)", () => {
    it("renders overlay content when embed mode is enabled", () => {
        const { container, cleanup } = renderSceneLayout({
            controls: <div data-testid="controls" />,
            canvas: <div data-testid="canvas" />,
            overlay: <div data-testid="overlay">overlay</div>,
            embed: true,
        });
        const overlay = container.querySelector('[data-testid="overlay"]');
        expect(overlay).toBeTruthy();
        const wrapper = overlay?.parentElement;
        expect(wrapper?.style.left).toBe("16px");
        expect(wrapper?.style.right).toBe("auto");
        cleanup();
    });

    it("renders overlay beside canvas when embed flag is disabled", () => {
        const { container, cleanup } = renderSceneLayout({
            controls: <div data-testid="controls" />,
            canvas: <div data-testid="canvas" />,
            overlay: <div data-testid="overlay">overlay</div>,
            embed: false,
        });
        const overlay = container.querySelector('[data-testid="overlay"]');
        expect(overlay).toBeTruthy();
        const canvasWrapper = container.querySelector('[data-testid="canvas"]')?.parentElement;
        expect(canvasWrapper?.style.position).toBe("relative");
        const overlayWrapper = overlay?.parentElement;
        expect(overlayWrapper?.style.position).toBe("absolute");
        expect(overlayWrapper?.style.top).toBe("16px");
        cleanup();
    });
});

describe("Scene overlay helpers", () => {
    const baseScene: SceneDefinition = {
        id: "euclidean-test",
        key: "test-scene",
        label: "Test Scene",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "test",
        supportsHandles: false,
        editable: false,
        renderPipelineId: EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    };

    it("falls back to default overlay when factory is missing", () => {
        const defaultOverlay = <div data-testid="fallback">fallback</div>;
        const resolved = resolveSceneEmbedOverlay({
            scene: baseScene,
            renderBackend: "canvas",
            defaultOverlay,
        });
        expect(resolved).toBe(defaultOverlay);
    });

    it("suppresses overlay when embedOverlayDefaultVisible is false", () => {
        const hiddenScene = { ...baseScene, embedOverlayDefaultVisible: false };
        const defaultOverlay = <div>overlay</div>;
        const resolved = resolveSceneEmbedOverlay({
            scene: hiddenScene,
            renderBackend: "canvas",
            defaultOverlay,
        });
        expect(resolved).toBeUndefined();
    });

    it("uses fallback when factory returns nullish", () => {
        const factoryScene = {
            ...baseScene,
            embedOverlayFactory: () => null,
        };
        const defaultOverlay = <div data-testid="fallback">fallback</div>;
        const resolved = resolveSceneEmbedOverlay({
            scene: factoryScene,
            renderBackend: "canvas",
            defaultOverlay,
        });
        expect(resolved).toBe(defaultOverlay);
    });

    it("allows controlsFactory to extend default controls", () => {
        const customScene: SceneDefinition = {
            ...baseScene,
            controlsFactory: ({ defaultControls }) => (
                <>
                    {defaultControls}
                    <span data-testid="extra">extra</span>
                </>
            ),
        };
        const defaultControls = <div data-testid="controls">controls</div>;
        const resolved = resolveSceneControls({
            scene: customScene,
            renderBackend: "canvas",
            defaultControls,
        });
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(<div>{resolved}</div>);
        });
        expect(container.querySelector('[data-testid="controls"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="extra"]')).not.toBeNull();
        act(() => {
            root.unmount();
        });
    });

    it("creates EmbedOverlayPanel by default", () => {
        const overlay = createDefaultEmbedOverlay({ scene: baseScene, subtitle: "Scene" });
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(<div>{overlay}</div>);
        });
        expect(container.textContent).toContain("Test Scene");
        act(() => {
            root.unmount();
        });
    });
});
