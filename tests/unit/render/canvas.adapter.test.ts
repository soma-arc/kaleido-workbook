/* @vitest-environment jsdom */

import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { drawCircle, drawLine, strokeTrianglePath } from "../../../src/render/canvasAdapter";
import type { TrianglePathSpec } from "../../../src/render/trianglePath";

function makeCtx() {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
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
        expect(ctx.beginPath as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.arc as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.stroke as unknown as Mock).toHaveBeenCalledTimes(1);
    });

    it("drawLine issues moveTo/lineTo+stroke", () => {
        const ctx = makeCtx();
        drawLine(ctx, { x1: 0, y1: 1, x2: 2, y2: 3 });
        expect(ctx.beginPath as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.moveTo as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.lineTo as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.stroke as unknown as Mock).toHaveBeenCalledTimes(1);
    });

    it("strokeTrianglePath draws arc segments", () => {
        const ctx = makeCtx();
        const tri: TrianglePathSpec = {
            kind: "triangle-path",
            barycenter: { x: 0.1, y: 0.1 },
            segments: [
                { kind: "line", a: { x: 0, y: 0 }, b: { x: 0.5, y: 0 } },
                {
                    kind: "arc",
                    a: { x: 0.5, y: 0 },
                    b: { x: 0.3, y: 0.4 },
                    center: { x: 0.4, y: 0.1 },
                    radius: 0.316,
                    ccw: true,
                },
                { kind: "line", a: { x: 0.3, y: 0.4 }, b: { x: 0, y: 0 } },
            ],
        };
        strokeTrianglePath(ctx, tri, { strokeStyle: "#000", lineWidth: 1 });
        expect(ctx.beginPath as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.arc as unknown as Mock).toHaveBeenCalledTimes(1);
        expect(ctx.lineTo as unknown as Mock).toHaveBeenCalled();
        expect(ctx.stroke as unknown as Mock).toHaveBeenCalledTimes(1);
    });
});
