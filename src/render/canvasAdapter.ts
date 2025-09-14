import type { CircleSpec, LineSpec } from "./primitives";

export type StrokeStyle = { strokeStyle?: string; lineWidth?: number };

function align05(x: number): number {
    // align 1px strokes to device pixel grid to avoid blur
    return Math.round(x) + 0.5;
}

export function drawCircle(
    ctx: CanvasRenderingContext2D,
    c: CircleSpec,
    style: StrokeStyle = {},
): void {
    const { strokeStyle = "#222", lineWidth = 1 } = style;
    ctx.save();
    ctx.beginPath();
    // pixel-align by nudging center for 1px strokes (simple heuristic)
    const cx = lineWidth === 1 ? align05(c.cx) : c.cx;
    const cy = lineWidth === 1 ? align05(c.cy) : c.cy;
    ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle as string;
    ctx.stroke();
    ctx.restore();
}

export function drawLine(
    ctx: CanvasRenderingContext2D,
    l: LineSpec,
    style: StrokeStyle = {},
): void {
    const { strokeStyle = "#222", lineWidth = 1 } = style;
    ctx.save();
    ctx.beginPath();
    const x1 = lineWidth === 1 ? align05(l.x1) : l.x1;
    const y1 = lineWidth === 1 ? align05(l.y1) : l.y1;
    const x2 = lineWidth === 1 ? align05(l.x2) : l.x2;
    const y2 = lineWidth === 1 ? align05(l.y2) : l.y2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle as string;
    ctx.stroke();
    ctx.restore();
}

export function clearRects(
    ctx: CanvasRenderingContext2D,
    rects: Array<{ x: number; y: number; w: number; h: number }>,
): void {
    for (const r of rects) ctx.clearRect(r.x, r.y, r.w, r.h);
}
