/**
 * 入力キャンバスの中央から正方形に切り抜いた新しいキャンバスを返す。
 * - 横長入力のみ左右をトリミングし、縦長・正方形はオリジナルを返す。
 * - OffscreenCanvas が使える環境では一時キャンバス経由で描画し、なければ DOM キャンバスを直接生成する。
 */
export function cropToCenteredSquare(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const width = canvas.width;
    const height = canvas.height;

    if (width <= 0 || height <= 0) {
        return canvas;
    }

    if (width <= height) {
        return canvas;
    }

    const squareSize = height;
    const halfGap = (width - squareSize) / 2;
    const sourceX = Math.max(0, Math.round(halfGap));
    const sourceWidth = Math.min(squareSize, width - sourceX);

    const drawIntoTarget = (
        target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ) => {
        target.drawImage(canvas, sourceX, 0, sourceWidth, squareSize, 0, 0, squareSize, squareSize);
    };

    const targetFromOffscreen = () => {
        if (typeof OffscreenCanvas !== "function") {
            return null;
        }
        try {
            const offscreen = new OffscreenCanvas(squareSize, squareSize);
            const offscreenCtx = offscreen.getContext("2d");
            if (!offscreenCtx) {
                return null;
            }
            drawIntoTarget(offscreenCtx);
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = squareSize;
            finalCanvas.height = squareSize;
            const finalCtx = finalCanvas.getContext("2d");
            if (!finalCtx) {
                return null;
            }
            finalCtx.drawImage(offscreen, 0, 0);
            return finalCanvas;
        } catch {
            return null;
        }
    };

    const htmlCanvas = () => {
        const targetCanvas = document.createElement("canvas");
        targetCanvas.width = squareSize;
        targetCanvas.height = squareSize;
        const ctx = targetCanvas.getContext("2d");
        if (!ctx) {
            return null;
        }
        drawIntoTarget(ctx);
        return targetCanvas;
    };

    return targetFromOffscreen() ?? htmlCanvas() ?? canvas;
}
