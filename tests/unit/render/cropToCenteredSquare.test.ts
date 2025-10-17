import { afterEach, describe, expect, it, vi } from "vitest";

import { cropToCenteredSquare } from "../../../src/render/crop";

function createMockCanvas(width: number, height: number) {
    const ctx = {
        drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
        width,
        height,
        getContext: vi.fn((kind: string) => (kind === "2d" ? ctx : null)),
    } as unknown as HTMLCanvasElement;
    Object.assign(ctx, { canvas });
    return { canvas, ctx };
}

describe("cropToCenteredSquare", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("crops landscape canvas to centered square", () => {
        const { canvas: source } = createMockCanvas(400, 200);
        const { canvas: target, ctx: targetCtx } = createMockCanvas(0, 0);
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
            if (tagName.toLowerCase() === "canvas") {
                return target;
            }
            return originalCreateElement(tagName);
        });

        const result = cropToCenteredSquare(source);

        expect(result).toBe(target);
        expect(target.width).toBe(200);
        expect(target.height).toBe(200);
        expect(targetCtx.drawImage).toHaveBeenCalledWith(source, 100, 0, 200, 200, 0, 0, 200, 200);
    });

    it("returns original canvas when already square", () => {
        const { canvas: source } = createMockCanvas(300, 300);
        expect(cropToCenteredSquare(source)).toBe(source);
    });

    it("returns original canvas when portrait", () => {
        const { canvas: source } = createMockCanvas(200, 400);
        expect(cropToCenteredSquare(source)).toBe(source);
    });
});
