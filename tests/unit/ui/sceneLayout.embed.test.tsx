import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { SceneLayout } from "@/ui/scenes/layouts";

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

    it("omits overlay when embed flag is disabled", () => {
        const { container, cleanup } = renderSceneLayout({
            controls: <div data-testid="controls" />,
            canvas: <div data-testid="canvas" />,
            overlay: <div data-testid="overlay">overlay</div>,
            embed: false,
        });
        const overlay = container.querySelector('[data-testid="overlay"]');
        expect(overlay).toBeNull();
        cleanup();
    });
});
