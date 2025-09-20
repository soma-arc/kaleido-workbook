import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { App } from "../../../src/ui/App";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value: function getContext(kind: string) {
            if (kind === "2d") {
                return createMockContext(this as HTMLCanvasElement);
            }
            return null;
        },
    });
});

afterAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value: originalGetContext,
    });
});

function createMockContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = {
        canvas,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
        lineWidth: 1,
        strokeStyle: "#000",
        lineJoin: "miter" as CanvasLineJoin,
        lineCap: "butt" as CanvasLineCap,
    } as Record<string, unknown>;
    return context as unknown as CanvasRenderingContext2D;
}

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
