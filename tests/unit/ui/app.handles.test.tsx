import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import { App } from "@/ui/App";

const renderMock = vi.fn();
const disposeMock = vi.fn();

vi.mock("@/render/engine", async () => {
    const actual = await vi.importActual<typeof import("@/render/engine")>("@/render/engine");
    return {
        ...actual,
        createRenderEngine: vi.fn(() => ({
            render: renderMock,
            dispose: disposeMock,
            getMode: () => "canvas",
        })),
    };
});

describe("App handle rendering", () => {
    it("sends handle overlay when enabled in Euclidean mode", async () => {
        renderMock.mockClear();
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        await act(async () => {
            root.render(<App />);
        });

        const euclideanButton = Array.from(container.querySelectorAll("button")).find((btn) =>
            btn.textContent?.toLowerCase().includes("euclidean"),
        );
        if (!euclideanButton) throw new Error("Euclidean mode button not found");
        await act(async () => {
            euclideanButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        const handleLabel = Array.from(container.querySelectorAll("label")).find((label) =>
            label.textContent?.includes("Show control handles"),
        );
        if (!handleLabel) throw new Error("Handle toggle label not found");
        const input = handleLabel.querySelector("input[type='checkbox']");
        if (!input) throw new Error("Handle toggle input not found");
        await act(async () => {
            input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        const calls = renderMock.mock.calls.map((call) => call[0]);
        const finalCall = calls.at(-1);
        expect(finalCall?.geometry).toBe("euclidean");
        expect(finalCall?.handles?.visible).toBe(true);
        const points = finalCall?.handles?.items?.[0]?.points;
        expect(Array.isArray(points)).toBe(true);
        expect(points?.length).toBeGreaterThan(0);

        await act(async () => {
            root.unmount();
        });
        container.remove();
    });
});
