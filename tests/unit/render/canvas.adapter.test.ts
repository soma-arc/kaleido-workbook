/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { drawCircle, drawLine } from "../../../src/render/canvasAdapter";

function makeCtx() {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
        lineWidth: 0,
        strokeStyle: "",
    } as unknown as CanvasRenderingContext2D;
}

describe("render/canvasAdapter", () => {
    it("drawCircle issues arc+stroke", () => {
        const ctx = makeCtx();
        drawCircle(ctx, { cx: 10, cy: 20, r: 5 });
        const anyCtx = ctx as any;
        expect(anyCtx.beginPath).toHaveBeenCalledTimes(1);
        expect(anyCtx.arc).toHaveBeenCalledTimes(1);
        expect(anyCtx.stroke).toHaveBeenCalledTimes(1);
    });

    it("drawLine issues moveTo/lineTo+stroke", () => {
        const ctx = makeCtx();
        drawLine(ctx, { x1: 0, y1: 1, x2: 2, y2: 3 });
        const anyCtx = ctx as any;
        expect(anyCtx.beginPath).toHaveBeenCalledTimes(1);
        expect(anyCtx.moveTo).toHaveBeenCalledTimes(1);
        expect(anyCtx.lineTo).toHaveBeenCalledTimes(1);
        expect(anyCtx.stroke).toHaveBeenCalledTimes(1);
    });
});
