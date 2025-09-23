import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { drawCircle, drawLine } from "./canvasAdapter";
import type { GeodesicPrimitive, RenderScene } from "./scene";
import type { Viewport } from "./viewport";
import { worldToScreen } from "./viewport";

export type CanvasTileStyle = {
    tileStroke?: string;
    diskStroke?: string;
    lineWidth?: number;
    drawDisk?: boolean;
};

export function renderTileLayer(
    ctx: CanvasRenderingContext2D,
    scene: RenderScene,
    viewport: Viewport,
    style: CanvasTileStyle = {},
): void {
    const tileStroke = style.tileStroke ?? "#4a90e2";
    const diskStroke = style.diskStroke ?? "#222";
    const lineWidth = style.lineWidth ?? 1;
    const drawDiskOption = style.drawDisk;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (scene.geometry === GEOMETRY_KIND.hyperbolic) {
        const shouldDrawDisk = drawDiskOption ?? true;
        if (shouldDrawDisk) {
            drawCircle(ctx, scene.disk, { strokeStyle: diskStroke, lineWidth });
        }
        for (const primitive of scene.geodesics) {
            drawGeodesicPrimitive(ctx, primitive, { strokeStyle: tileStroke, lineWidth });
        }
        return;
    }

    for (const plane of scene.halfPlanes) {
        drawHalfPlaneBoundary(ctx, plane, viewport, { strokeStyle: tileStroke, lineWidth });
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

function drawHalfPlaneBoundary(
    ctx: CanvasRenderingContext2D,
    plane: HalfPlane,
    viewport: Viewport,
    style: { strokeStyle: string; lineWidth: number },
): void {
    const normal = plane.normal;
    const tangent = { x: -normal.y, y: normal.x };
    const origin = { x: -plane.offset * normal.x, y: -plane.offset * normal.y };
    const scale = Math.max(ctx.canvas.width, ctx.canvas.height) / (Math.abs(viewport.scale) || 1);
    const length = scale * 1.5;
    const aWorld = {
        x: origin.x + tangent.x * length,
        y: origin.y + tangent.y * length,
    };
    const bWorld = {
        x: origin.x - tangent.x * length,
        y: origin.y - tangent.y * length,
    };
    const a = worldToScreen(viewport, aWorld);
    const b = worldToScreen(viewport, bWorld);
    drawLine(ctx, { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, style);
}
