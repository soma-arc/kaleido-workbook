import { describe, expect, it, vi } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { renderHandleOverlay, renderTileLayer } from "@/render/canvasLayers";

function createMockContext(): CanvasRenderingContext2D {
    const canvas = document.createElement("canvas");
    const ctx = {
        canvas,
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        arc: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        lineWidth: 1,
        strokeStyle: "#000",
        fillStyle: "#000",
    } as unknown as CanvasRenderingContext2D;
    return ctx;
}

describe("renderTileLayer handle overlay", () => {
    it("draws fixed handles as squares and free handles as circles", () => {
        const ctx = createMockContext();
        renderTileLayer(
            ctx,
            { geometry: GEOMETRY_KIND.euclidean, halfPlanes: [] },
            { scale: 100, tx: 0, ty: 0 },
        );
        renderHandleOverlay(
            ctx,
            { scale: 100, tx: 0, ty: 0 },
            {
                visible: true,
                handles: [
                    {
                        planeIndex: 0,
                        points: [
                            { id: "hinge", x: 0, y: 0, fixed: true },
                            { id: "free", x: 1, y: 0, fixed: false },
                        ],
                    },
                ],
            },
        );
        expect(ctx.fillRect).toHaveBeenCalled();
        expect(ctx.strokeRect).toHaveBeenCalled();
        expect(ctx.arc).toHaveBeenCalled();
    });
});
