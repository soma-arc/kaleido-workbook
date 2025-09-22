import { drawCircle, drawLine } from "./canvasAdapter";
import type { GeodesicPrimitive, RenderScene } from "./scene";

export type CanvasTileStyle = {
    tileStroke?: string;
    diskStroke?: string;
    lineWidth?: number;
    drawDisk?: boolean;
};

export function renderTileLayer(
    ctx: CanvasRenderingContext2D,
    scene: RenderScene,
    style: CanvasTileStyle = {},
): void {
    const tileStroke = style.tileStroke ?? "#4a90e2";
    const diskStroke = style.diskStroke ?? "#222";
    const lineWidth = style.lineWidth ?? 1;
    const drawDiskOption = style.drawDisk;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const shouldDrawDisk = drawDiskOption ?? scene.geometry === "hyperbolic";
    if (shouldDrawDisk && scene.geometry === "hyperbolic") {
        drawCircle(ctx, scene.disk, { strokeStyle: diskStroke, lineWidth });
    }
    for (const primitive of scene.geodesics) {
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
