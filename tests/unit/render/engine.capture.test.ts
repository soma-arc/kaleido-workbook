import { beforeEach, describe, expect, it, vi } from "vitest";

const createWebGLRendererMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/render/webglRenderer", () => ({
    createWebGLRenderer: createWebGLRendererMock,
}));

import { createRenderEngine } from "../../../src/render/engine";

function createMockCanvas(width = 320, height = 240) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
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
            width,
            height,
            top: 0,
            left: 0,
            right: width,
            bottom: height,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        }),
    });
    return { canvas, ctx };
}

describe("RenderEngine capture", () => {
    beforeEach(() => {
        createWebGLRendererMock.mockReset();
    });

    it("returns the composite canvas when requested", () => {
        createWebGLRendererMock.mockReturnValue({
            ready: false,
            canvas: null,
            renderer: { render: vi.fn(), dispose: vi.fn() },
        });
        const { canvas } = createMockCanvas();
        const engine = createRenderEngine(canvas, { mode: "canvas" });
        engine.render({
            geometry: "euclidean",
            halfPlanes: [
                { anchor: { x: 0, y: 0 }, normal: { x: 1, y: 0 } },
                { anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } },
            ],
        });
        expect(engine.capture("composite")).toBe(canvas);
    });

    it("returns the webgl canvas when ready", () => {
        const glCanvas = document.createElement("canvas");
        createWebGLRendererMock.mockReturnValue({
            ready: true,
            canvas: glCanvas,
            renderer: { render: vi.fn(), dispose: vi.fn() },
        });
        const { canvas } = createMockCanvas();
        const engine = createRenderEngine(canvas, { mode: "hybrid" });
        engine.render({
            geometry: "euclidean",
            halfPlanes: [
                { anchor: { x: 0, y: 0 }, normal: { x: 1, y: 0 } },
                { anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } },
            ],
        });
        expect(engine.capture("webgl")).toBe(glCanvas);
        expect(engine.capture("composite")).toBe(canvas);
    });

    it("falls back when webgl canvas is unavailable", () => {
        createWebGLRendererMock.mockReturnValue({
            ready: true,
            canvas: null,
            renderer: { render: vi.fn(), dispose: vi.fn() },
        });
        const { canvas } = createMockCanvas();
        const engine = createRenderEngine(canvas, { mode: "hybrid" });
        engine.render({
            geometry: "hyperbolic",
            params: { p: 2, q: 3, r: 7, depth: 1 },
        });
        expect(engine.capture("webgl")).toBeNull();
    });
});
