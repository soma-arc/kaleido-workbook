import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
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

export type HalfPlaneHandleOverlay = {
    visible: boolean;
    handles: Array<{
        planeIndex: number;
        points: HalfPlaneControlPoints;
    }>;
    active?: { planeIndex: number; pointIndex: 0 | 1 } | null;
    radius?: number;
    fillStyle?: string;
    strokeStyle?: string;
};

export type CanvasTileRenderOptions = CanvasTileStyle & {
    handleOverlay?: HalfPlaneHandleOverlay;
};

export function renderTileLayer(
    ctx: CanvasRenderingContext2D,
    scene: RenderScene,
    viewport: Viewport,
    options: CanvasTileRenderOptions = {},
): void {
    const tileStroke = options.tileStroke ?? "#4a90e2";
    const diskStroke = options.diskStroke ?? "#222";
    const lineWidth = options.lineWidth ?? 1;
    const drawDiskOption = options.drawDisk;
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

    if (options.handleOverlay?.visible) {
        drawHalfPlaneHandles(ctx, viewport, options.handleOverlay);
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

function drawHalfPlaneHandles(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    overlay: HalfPlaneHandleOverlay,
): void {
    const radius = overlay.radius ?? 6;
    const fillStyle = overlay.fillStyle ?? "rgba(255, 165, 0, 0.85)";
    const strokeStyle = overlay.strokeStyle ?? "#222";
    const active = overlay.active;
    ctx.save();
    for (const handle of overlay.handles) {
        handle.points.forEach((point, pointIndex) => {
            const projected = worldToScreen(viewport, point);
            ctx.beginPath();
            ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = fillStyle;
            if (
                active &&
                active.planeIndex === handle.planeIndex &&
                active.pointIndex === pointIndex
            ) {
                ctx.fillStyle = "#ff5722";
            }
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        });
    }
    ctx.restore();
}
