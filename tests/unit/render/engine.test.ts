import { describe, expect, it, vi } from "vitest";
import { createRenderEngine } from "../../../src/render/engine";

function createMockCanvas() {
    const canvas = document.createElement("canvas");
    const ctx = {
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
        drawImage: vi.fn(),
        lineWidth: 1,
        strokeStyle: "#000",
        lineJoin: "miter",
        lineCap: "butt",
    } as unknown as CanvasRenderingContext2D;
    Object.defineProperty(canvas, "getContext", {
        value: vi.fn((kind: string) => (kind === "2d" ? ctx : null)),
    });
    Object.defineProperty(canvas, "getBoundingClientRect", {
        value: () => ({
            width: 200,
            height: 200,
            top: 0,
            left: 0,
            right: 200,
            bottom: 200,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        }),
    });
    return { canvas, ctx };
}

describe("createRenderEngine", () => {
    it("renders via canvas mode", () => {
        const { canvas, ctx } = createMockCanvas();
        const engine = createRenderEngine(canvas, { mode: "canvas" });
        engine.render({ p: 2, q: 3, r: 7, depth: 1 });
        expect(ctx.clearRect).toHaveBeenCalled();
        engine.dispose();
    });

    it("initialises hybrid mode and logs WebGL errors when unavailable", () => {
        const { canvas, ctx } = createMockCanvas();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const engine = createRenderEngine(canvas, { mode: "hybrid" });
        engine.render({ p: 2, q: 3, r: 7, depth: 1 });
        expect(errorSpy).toHaveBeenCalled();
        expect(ctx.drawImage).toHaveBeenCalled();
        engine.dispose();
        errorSpy.mockRestore();
    });
});
