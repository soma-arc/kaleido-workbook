import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vitest";
import { App } from "../../../src/ui/App";

// Minimal render test to ensure #stage canvas exists
describe("App", () => {
    it("renders a canvas with id #stage", async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        const root = createRoot(host);
        await act(async () => {
            root.render(<App />);
        });
        const stage = host.querySelector("#stage") as HTMLCanvasElement | null;
        expect(stage).not.toBeNull();
        if (stage) {
            expect(stage.tagName.toLowerCase()).toBe("canvas");
            expect(stage.width).toBeGreaterThan(0);
            expect(stage.height).toBeGreaterThan(0);
        }

        const depthSlider = host.querySelector('input[type="range"]');
        expect(depthSlider).not.toBeNull();
    });
});
