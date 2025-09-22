import type { Vec2 } from "./types";
import { defaultTol, tolValue } from "./types";

export type GeodesicCircle = { kind: "circle"; c: Vec2; r: number };
export type GeodesicDiameter = { kind: "diameter"; dir: Vec2 };
export type GeodesicHalfPlane = { kind: "halfPlane"; normal: Vec2; offset: number };
export type Geodesic = GeodesicCircle | GeodesicDiameter | GeodesicHalfPlane;

function isOpposite(a: Vec2, b: Vec2): boolean {
    // a ≈ -b  <=>  |a + b| ≈ 0
    const s = { x: a.x + b.x, y: a.y + b.y };
    const eps = tolValue(1, defaultTol);
    return Math.hypot(s.x, s.y) <= eps;
}

function solveCenterFromDot1(a: Vec2, b: Vec2): Vec2 {
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

function normalize(v: Vec2): Vec2 {
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
export function geodesicFromBoundary(a: Vec2, b: Vec2): Geodesic {
    if (
        !Number.isFinite(a.x) ||
        !Number.isFinite(a.y) ||
        !Number.isFinite(b.x) ||
        !Number.isFinite(b.y)
    ) {
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

/**
 * geodesicThroughPoints
 * Construct the unique Poincaré geodesic passing through two interior points p,q (p≠q).
 * - If either point is the origin, or p and q are colinear with the origin, returns a diameter with unit dir.
 * - Otherwise returns the circle orthogonal to the unit circle that passes through p and q.
 *
 * Derivation for circle case:
 *  For orthogonality, |c|^2 - r^2 = 1. Passing through x∈{p,q} gives |x-c|^2 = r^2 => |x|^2 - 2 x·c + |c|^2 = r^2.
 *  Eliminate r^2 to get linear constraints 2 x·c = |x|^2 + 1 for x=p and x=q. Solve 2 [p;q] c = [|p|^2+1; |q|^2+1].
 */
export function geodesicThroughPoints(p: Vec2, q: Vec2): Geodesic {
    const fin = (v: Vec2) => Number.isFinite(v.x) && Number.isFinite(v.y);
    if (!fin(p) || !fin(q)) throw new Error("Non-finite point for geodesicThroughPoints");

    const np = Math.hypot(p.x, p.y);
    const nq = Math.hypot(q.x, q.y);
    const eps = tolValue(1, defaultTol);

    // If either is (near) origin, geodesic is the diameter along the other.
    if (np <= eps && nq <= eps) return { kind: "diameter", dir: { x: 1, y: 0 } };
    if (np <= eps) {
        const s = Math.hypot(q.x, q.y) || 1;
        return { kind: "diameter", dir: { x: q.x / s, y: q.y / s } };
    }
    if (nq <= eps) {
        const s = Math.hypot(p.x, p.y) || 1;
        return { kind: "diameter", dir: { x: p.x / s, y: p.y / s } };
    }

    // Colinear with origin => diameter
    const cross = p.x * q.y - p.y * q.x;
    if (Math.abs(cross) <= eps) {
        const s = np || 1;
        return { kind: "diameter", dir: { x: p.x / s, y: p.y / s } };
    }

    // Solve 2 M c = b  => M c = b/2 where M = [[px, py],[qx, qy]]
    const det = p.x * q.y - p.y * q.x;
    if (Math.abs(det) <= eps) {
        const s = np || 1;
        return { kind: "diameter", dir: { x: p.x / s, y: p.y / s } };
    }
    const bp = p.x * p.x + p.y * p.y + 1;
    const bq = q.x * q.x + q.y * q.y + 1;
    // Cramer's rule for M c = [bp/2, bq/2]
    const bx = bp * 0.5;
    const by = bq * 0.5;
    const cx = (bx * q.y - by * p.y) / det;
    const cy = (p.x * by - q.x * bx) / det;
    const cc = cx * cx + cy * cy;
    const r2 = Math.max(0, cc - 1);
    const r = Math.sqrt(r2);
    return { kind: "circle", c: { x: cx, y: cy }, r };
}
