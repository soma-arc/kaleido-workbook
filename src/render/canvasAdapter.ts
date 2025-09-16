import type { CircleSpec, LineSpec } from "./primitives";
import type { TrianglePathSpec } from "./trianglePath";

export type StrokeStyle = {
    strokeStyle?: string;
    lineWidth?: number;
    lineJoin?: CanvasLineJoin;
    lineCap?: CanvasLineCap;
};

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

export function strokeTrianglePath(
    ctx: CanvasRenderingContext2D,
    tri: TrianglePathSpec,
    style?: StrokeStyle,
) {
    ctx.save();
    if (style?.strokeStyle) ctx.strokeStyle = style.strokeStyle;
    if (style?.lineWidth) ctx.lineWidth = style.lineWidth;
    if (style?.lineJoin) ctx.lineJoin = style.lineJoin;
    if (style?.lineCap) ctx.lineCap = style.lineCap;
    ctx.beginPath();
    const [s0, s1, s2] = tri.segments;
    ctx.moveTo(s0.a.x, s0.a.y);
    for (const seg of [s0, s1, s2]) {
        if (seg.kind === "line") {
            ctx.lineTo(seg.b.x, seg.b.y);
        } else {
            // Arc: use center, radius; determine start/end angles
            const a = Math.atan2(seg.a.y - seg.center.y, seg.a.x - seg.center.x);
            const b = Math.atan2(seg.b.y - seg.center.y, seg.b.x - seg.center.x);
            ctx.arc(seg.center.x, seg.center.y, seg.radius, a, b, seg.ccw);
        }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}
