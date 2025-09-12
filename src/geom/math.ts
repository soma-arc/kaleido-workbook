import type { Vec } from "./types";

/**
 * Euclidean distance between two points.
 */
export function distance(a: Vec, b: Vec): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Numerically safe square root.
 * - For small negative inputs within |x| <= eps, returns 0.
 * - For negative inputs beyond the epsilon, returns NaN to signal invalid.
 */
export function safeSqrt(x: number, eps = 1e-15): number {
    if (x < 0) {
        return x >= -Math.abs(eps) ? 0 : NaN;
    }
    return Math.sqrt(x);
}

/**
 * Rotate a vector by +90 degrees: (x, y) -> (-y, x).
 */
export function perp90(v: Vec): Vec {
    return { x: -v.y, y: v.x };
}
