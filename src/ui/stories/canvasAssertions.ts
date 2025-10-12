import { expect, waitFor } from "@storybook/test";

type SamplePoint = { x: number; y: number };

type CanvasSampleOptions = { points?: SamplePoint[]; minAlpha?: number };

function sampleWith2DContext(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    { points = [{ x: 0.5, y: 0.5 }], minAlpha = 16 }: CanvasSampleOptions,
) {
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return false;
    return points.some(({ x, y }) => {
        const px = Math.max(0, Math.min(width - 1, Math.floor(width * x)));
        const py = Math.max(0, Math.min(height - 1, Math.floor(height * y)));
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        return pixel[3] >= minAlpha;
    });
}

function sampleWithWebGLContext(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    { points = [{ x: 0.5, y: 0.5 }], minAlpha = 16 }: CanvasSampleOptions,
) {
    const width = canvas.width || gl.drawingBufferWidth || 1;
    const height = canvas.height || gl.drawingBufferHeight || 1;
    const buffer = new Uint8Array(4);
    return points.some(({ x, y }) => {
        const px = Math.max(0, Math.min(width - 1, Math.floor(width * x)));
        const py = Math.max(0, Math.min(height - 1, Math.floor(height * y)));
        gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        return buffer[3] >= minAlpha;
    });
}

export async function expectCanvasFill(
    canvas: HTMLCanvasElement,
    options: CanvasSampleOptions = {},
): Promise<void> {
    const ctx2d = canvas.getContext("2d");
    const gl = ctx2d ? null : canvas.getContext("webgl2");
    if (!ctx2d && !gl) {
        throw new Error("No canvas context available for sampling");
    }

    await waitFor(() => {
        const hit = ctx2d
            ? sampleWith2DContext(ctx2d, canvas, options)
            : sampleWithWebGLContext(gl as WebGL2RenderingContext, canvas, options);
        expect(hit).toBe(true);
    });
}
