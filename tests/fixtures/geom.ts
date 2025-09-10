import type { Circle, Vec } from "../../src/geom/types";

export function sortPts(pts: Vec[]): Vec[] {
    return [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
}

export function transformCircle(
    s: number,
    angle: number,
    tx: number,
    ty: number,
    c: Circle,
): Circle {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const x = c.c.x;
    const y = c.c.y;
    const xr = s * (ca * x - sa * y) + tx;
    const yr = s * (sa * x + ca * y) + ty;
    return { c: { x: xr, y: yr }, r: Math.abs(s) * c.r };
}

export function transformPoint(s: number, angle: number, tx: number, ty: number, p: Vec): Vec {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const xr = s * (ca * p.x - sa * p.y) + tx;
    const yr = s * (sa * p.x + ca * p.y) + ty;
    return { x: xr, y: yr };
}
