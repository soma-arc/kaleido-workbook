import type { Vec } from "./types";
import { defaultTol, tolValue } from "./types";

export type GeodesicCircle = { kind: "circle"; c: Vec; r: number };
export type GeodesicDiameter = { kind: "diameter"; dir: Vec };
export type Geodesic = GeodesicCircle | GeodesicDiameter;

function isOpposite(a: Vec, b: Vec): boolean {
    // a ≈ -b  <=>  |a + b| ≈ 0
    const s = { x: a.x + b.x, y: a.y + b.y };
    const eps = tolValue(1, defaultTol);
    return Math.hypot(s.x, s.y) <= eps;
}

function solveCenterFromDot1(a: Vec, b: Vec): Vec {
    // Solve for c such that a·c = 1 and b·c = 1
    const det = a.x * b.y - a.y * b.x;
    const eps = tolValue(1, defaultTol);
    if (Math.abs(det) <= eps) {
        throw new Error("Degenerate boundary pair: nearly equal or opposite");
    }
    const cx = (b.y - a.y) / det;
    const cy = (a.x - b.x) / det;
    return { x: cx, y: cy };
}

function normalize(v: Vec): Vec {
    const n = Math.hypot(v.x, v.y);
    if (!(n > 0) || !Number.isFinite(n)) return { x: 1, y: 0 };
    return { x: v.x / n, y: v.y / n };
}

/**
 * geodesicFromBoundary
 * Construct the Poincaré disk geodesic determined by two boundary points a,b.
 * - If a and b are opposite on the unit circle, returns a diameter through the origin with unit direction `dir`.
 * - Otherwise returns the unique circle orthogonal to the unit circle passing through a and b.
 *   The circle center c satisfies a·c = b·c = 1 and |c|^2 = 1 + r^2.
 *
 * Constraints: a and b should lie on the unit circle and be distinct.
 * Degenerate inputs (a≈b, singular system) throw an Error.
 */
export function geodesicFromBoundary(a: Vec, b: Vec): Geodesic {
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) {
        throw new Error("Non-finite boundary point");
    }
    // Equal endpoints guard
    const eq = Math.hypot(a.x - b.x, a.y - b.y) <= tolValue(1, defaultTol);
    if (eq) throw new Error("Degenerate boundary pair: identical points");

    if (isOpposite(a, b)) {
        return { kind: "diameter", dir: normalize(a) };
    }

    const c = solveCenterFromDot1(a, b);
    // Prefer geometric radius from endpoint to improve stability for nearly coincident endpoints
    const r = Math.hypot(a.x - c.x, a.y - c.y);
    return { kind: "circle", c, r };
}
