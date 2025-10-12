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
        engine.render({ geometry: "hyperbolic", params: { p: 2, q: 3, r: 7, depth: 1 } });
        expect(ctx.clearRect).toHaveBeenCalled();
        engine.dispose();
    });

    it("initialises hybrid mode and logs WebGL errors when unavailable", () => {
        const { canvas, ctx } = createMockCanvas();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const engine = createRenderEngine(canvas, { mode: "hybrid" });
        engine.render({ geometry: "hyperbolic", params: { p: 2, q: 3, r: 7, depth: 1 } });
        expect(errorSpy).toHaveBeenCalled();
        expect(ctx.drawImage).not.toHaveBeenCalled();
        expect(ctx.clearRect).toHaveBeenCalled();
        engine.dispose();
        errorSpy.mockRestore();
    });

    it("uses hybrid mode by default", () => {
        const { canvas, ctx } = createMockCanvas();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const engine = createRenderEngine(canvas);
        expect(engine.getMode()).toBe("hybrid");
        engine.render({ geometry: "hyperbolic", params: { p: 2, q: 3, r: 7, depth: 1 } });
        expect(ctx.clearRect).toHaveBeenCalled();
        expect(ctx.drawImage).not.toHaveBeenCalled();
        engine.dispose();
        errorSpy.mockRestore();
    });

    it("accepts Euclidean render requests", () => {
        const { canvas, ctx } = createMockCanvas();
        const engine = createRenderEngine(canvas, { mode: "canvas" });
        engine.render({
            geometry: "euclidean",
            halfPlanes: [
                { anchor: { x: 0, y: 0 }, normal: { x: 1, y: 0 } },
                { anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } },
                {
                    anchor: { x: 0, y: 0 },
                    normal: { x: -Math.sqrt(0.5), y: Math.sqrt(0.5) },
                },
            ],
        });
        expect(ctx.clearRect).toHaveBeenCalled();
        engine.dispose();
    });

    it("logs warning but renders when hyperbolic constraint fails", () => {
        const { canvas, ctx } = createMockCanvas();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const engine = createRenderEngine(canvas, { mode: "canvas" });
        expect(() =>
            engine.render({ geometry: "hyperbolic", params: { p: 3, q: 3, r: 3, depth: 1 } }),
        ).not.toThrow();
        expect(warnSpy).toHaveBeenCalled();
        expect(ctx.clearRect).toHaveBeenCalled();
        engine.dispose();
        warnSpy.mockRestore();
    });
});
