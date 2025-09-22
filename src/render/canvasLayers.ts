import { drawCircle, drawLine } from "./canvasAdapter";
import type { GeodesicPrimitive, HyperbolicScene } from "./scene";

export type CanvasTileStyle = {
    tileStroke?: string;
    diskStroke?: string;
    lineWidth?: number;
    drawDisk?: boolean;
};

const DEFAULT_STYLE: Required<CanvasTileStyle> = {
    tileStroke: "#4a90e2",
    diskStroke: "#222",
    lineWidth: 1,
    drawDisk: true,
};

export function renderTileLayer(
    ctx: CanvasRenderingContext2D,
    scene: HyperbolicScene,
    style: CanvasTileStyle = {},
): void {
    const { tileStroke, diskStroke, lineWidth, drawDisk } = { ...DEFAULT_STYLE, ...style };
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (drawDisk) {
        drawCircle(ctx, scene.disk, { strokeStyle: diskStroke, lineWidth });
    }
    for (const primitive of scene.tiles) {
        drawGeodesicPrimitive(ctx, primitive, { strokeStyle: tileStroke, lineWidth });
    }
}

function drawGeodesicPrimitive(
    ctx: CanvasRenderingContext2D,
    primitive: GeodesicPrimitive,
    style: { strokeStyle: string; lineWidth: number },
): void {
    if (primitive.kind === "circle") {
        drawCircle(ctx, primitive.circle, style);
        return;
    }
    drawLine(ctx, primitive.line, style);
}
