import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import {
    ImageExportControls,
    type ImageExportMode,
    type ImageExportStatus,
} from "../../../../src/ui/components/ImageExportControls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderComponent(
    mode: ImageExportMode,
    status: ImageExportStatus = null,
    disabled = false,
) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const handleMode = vi.fn();
    const handleExport = vi.fn();
    act(() => {
        root.render(
            <ImageExportControls
                mode={mode}
                onModeChange={handleMode}
                onExport={handleExport}
                status={status}
                disabled={disabled}
            />,
        );
    });
    const cleanup = () => {
        act(() => {
            root.unmount();
        });
        container.remove();
    };
    return { container, handleMode, handleExport, cleanup, root };
}

describe("ImageExportControls", () => {
    it("calls onModeChange when switching select options", () => {
        const { container, handleMode, cleanup } = renderComponent("composite");
        const select = container.querySelector<HTMLSelectElement>(
            'select[name="image-export-mode"]',
        );
        if (!select) throw new Error("select not found");
        act(() => {
            select.value = "square-webgl";
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        expect(handleMode).toHaveBeenCalledWith("square-webgl");
        cleanup();
    });

    it("calls onExport when pressing the save button", () => {
        const { container, handleExport, cleanup } = renderComponent("square-composite");
        const button = container.querySelector("button");
        if (!button) throw new Error("button not found");
        act(() => {
            button.click();
        });
        expect(handleExport).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it("renders status messages", () => {
        const { container, cleanup } = renderComponent("webgl", {
            tone: "warning",
            message: "Fallback used",
        });
        const status = container.querySelector('[aria-live="polite"]');
        expect(status?.textContent).toContain("Fallback used");
        cleanup();
    });
});
