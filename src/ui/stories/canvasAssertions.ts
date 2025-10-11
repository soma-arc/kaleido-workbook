import { expect, waitFor } from "@storybook/test";

type SamplePoint = { x: number; y: number };

export async function expectCanvasFill(
    canvas: HTMLCanvasElement,
    options: { points?: SamplePoint[]; minAlpha?: number } = {},
): Promise<void> {
    const { points = [{ x: 0.5, y: 0.5 }], minAlpha = 16 } = options;
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        throw new Error("WebGL2 context is unavailable for the stage canvas");
    }
    const width = canvas.width || gl.drawingBufferWidth || 1;
    const height = canvas.height || gl.drawingBufferHeight || 1;
    const buffer = new Uint8Array(4);

    await waitFor(() => {
        const hit = points.some(({ x, y }) => {
            const px = Math.max(0, Math.min(width - 1, Math.floor(width * x)));
            const py = Math.max(0, Math.min(height - 1, Math.floor(height * y)));
            gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
            return buffer[3] >= minAlpha;
        });
        expect(hit).toBe(true);
    });
}
