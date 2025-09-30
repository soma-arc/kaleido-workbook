import type { Vec2 } from "./types";

/**
 * Euclidean distance between two points.
 */
export function distance(a: Vec2, b: Vec2): number {
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
export function perp90(v: Vec2): Vec2 {
    return { x: -v.y, y: v.x };
}

const TAU = 2 * Math.PI;

/**
 * Clamp a value between the provided bounds.
 */
export function clamp(value: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, value));
}

/**
 * Normalize an angle into the half-open interval [0, 2π).
 */
export function normalizeAngle0ToTau(theta: number): number {
    let t = theta % TAU;
    if (t < 0) t += TAU;
    return t;
}

/**
 * Normalize an angle into the interval (-π, π].
 */
export function normalizeAngleMinusPiToPi(theta: number): number {
    let t = ((theta + Math.PI) % TAU) - Math.PI;
    if (t <= -Math.PI) t += TAU;
    if (t > Math.PI) t -= TAU;
    return t;
}
