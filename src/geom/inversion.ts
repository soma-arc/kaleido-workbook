import type { Circle, Vec2 } from "./types";
import { defaultTol, tolValue } from "./types";

/**
 * Inversion in the unit circle.
 * For p = (x, y), p' = p / |p|^2. Points on the unit circle are fixed.
 * Near the origin (|p| ≈ 0), returns the input point unchanged to avoid infinities.
 */
export function invertUnit(p: Vec2): Vec2 {
    const { x, y } = p;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { x, y };
    const r2 = x * x + y * y;
    const eps = tolValue(1, defaultTol);
    if (r2 <= eps) return { x, y };
    return { x: x / r2, y: y / r2 };
}

/**
 * Inversion in an arbitrary circle C with center c and radius r.
 * For p, define v = p - c, then p' = c + (r^2 / |v|^2) * v.
 * Points on the circle are fixed. Near the center (|v| ≈ 0), returns p unchanged.
 */
export function invertInCircle(p: Vec2, C: Circle): Vec2 {
    const vx = p.x - C.c.x;
    const vy = p.y - C.c.y;
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) return { x: p.x, y: p.y };
    const d2 = vx * vx + vy * vy;
    // Only treat the exact center as a special case; otherwise compute normally to preserve involution
    if (d2 === 0) return { x: p.x, y: p.y };
    const k = (C.r * C.r) / d2;
    return { x: C.c.x + k * vx, y: C.c.y + k * vy };
}
