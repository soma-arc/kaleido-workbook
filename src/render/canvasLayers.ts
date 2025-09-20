import { drawCircle, drawLine } from "./canvasAdapter";
import type { TilePrimitive, TileScene } from "./scene";

export type CanvasTileStyle = {
    tileStroke?: string;
    diskStroke?: string;
    lineWidth?: number;
};

const DEFAULT_STYLE: Required<CanvasTileStyle> = {
    tileStroke: "#4a90e2",
    diskStroke: "#222",
    lineWidth: 1,
};

export function renderTileLayer(
    ctx: CanvasRenderingContext2D,
    scene: TileScene,
    style: CanvasTileStyle = {},
): void {
    const { tileStroke, diskStroke, lineWidth } = { ...DEFAULT_STYLE, ...style };
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawCircle(ctx, scene.disk, { strokeStyle: diskStroke, lineWidth });
    for (const primitive of scene.tiles) {
        drawTilePrimitive(ctx, primitive, { strokeStyle: tileStroke, lineWidth });
    }
}

function drawTilePrimitive(
    ctx: CanvasRenderingContext2D,
    primitive: TilePrimitive,
    style: { strokeStyle: string; lineWidth: number },
): void {
    if (primitive.kind === "circle") {
        drawCircle(ctx, primitive.circle, style);
        return;
    }
    drawLine(ctx, primitive.line, style);
}
