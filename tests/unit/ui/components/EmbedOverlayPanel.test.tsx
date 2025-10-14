import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { EmbedOverlayPanel } from "@/ui/components/EmbedOverlayPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("EmbedOverlayPanel", () => {
    it("renders title, subtitle, body, and footer", () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        act(() => {
            root.render(
                <EmbedOverlayPanel title="Sample Scene" subtitle="Scene" footer="Footer note">
                    <button type="button">Action</button>
                </EmbedOverlayPanel>,
            );
        });
        expect(container.textContent ?? "").toContain("Sample Scene");
        expect(container.textContent ?? "").toContain("Scene");
        expect(container.textContent ?? "").toContain("Action");
        expect(container.textContent ?? "").toContain("Footer note");
        act(() => {
            root.unmount();
        });
        container.remove();
    });
});
