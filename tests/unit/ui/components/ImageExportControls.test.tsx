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
    it("calls onModeChange when switching radio buttons", () => {
        const { container, handleMode, cleanup } = renderComponent("webgl");
        const compositeRadio = container.querySelector<HTMLInputElement>(
            'input[value="composite"]',
        );
        if (!compositeRadio) throw new Error("radio not found");
        act(() => {
            compositeRadio.click();
        });
        expect(handleMode).toHaveBeenCalledWith("composite");
        cleanup();
    });

    it("calls onExport when pressing the save button", () => {
        const { container, handleExport, cleanup } = renderComponent("composite");
        const button = container.querySelector("button");
        if (!button) throw new Error("button not found");
        act(() => {
            button.click();
        });
        expect(handleExport).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it("renders status messages", () => {
        const { container, cleanup } = renderComponent("composite", {
            tone: "warning",
            message: "Fallback used",
        });
        const status = container.querySelector('[aria-live="polite"]');
        expect(status?.textContent).toContain("Fallback used");
        cleanup();
    });
});
