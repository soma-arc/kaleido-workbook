import { normalizeAngleMinusPiToPi } from "@/geom/core/math";
import type { Tolerance, Vec2 } from "@/geom/core/types";
import { defaultTol, tolValue } from "@/geom/core/types";

export function angleToBoundaryPoint(theta: number): Vec2 {
    const t = normalizeAngleMinusPiToPi(theta);
    return { x: Math.cos(t), y: Math.sin(t) };
}

export function boundaryPointToAngle(p: Vec2): number {
    const x = Number.isFinite(p.x) ? p.x : 1;
    const y = Number.isFinite(p.y) ? p.y : 0;
    // Normalize first to guard slightly off-circle inputs
    const m = Math.hypot(x, y);
    if (!(m > 0)) return 0;
    const xn = x / m;
    const yn = y / m;
    return normalizeAngleMinusPiToPi(Math.atan2(yn, xn));
}

export function isOnUnitCircle(p: Vec2, tol: Tolerance = defaultTol): boolean {
    const r = Math.hypot(p.x, p.y);
    if (!Number.isFinite(r)) return false;
    const eps = tolValue(1, tol);
    return Math.abs(r - 1) <= eps;
}

export function normalizeOnUnitCircle(p: Vec2): Vec2 {
    const r = Math.hypot(p.x, p.y);
    if (!Number.isFinite(r) || !(r > 0)) return { x: 1, y: 0 };
    return { x: p.x / r, y: p.y / r };
}
