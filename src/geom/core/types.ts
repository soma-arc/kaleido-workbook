/**
 * 2Dベクトル（公開名を Vec2 に統一・旧 Vec は廃止）。
 */
export type Vec2 = { x: number; y: number };

/**
 * Circle represented by center `c` and radius `r` (r > 0).
 */
export type Circle = { c: Vec2; r: number };

/**
 * Intersection classification between two circles.
 */
export const INTERSECT_KIND = {
    none: "none",
    tangent: "tangent",
    two: "two",
    concentric: "concentric",
    coincident: "coincident",
} as const;

export type IntersectKind = (typeof INTERSECT_KIND)[keyof typeof INTERSECT_KIND];

/**
 * Result of circle-circle intersection.
 * - When `kind` is 'two' or 'tangent', `points` is present.
 * - For 'two', `points` contains two points sorted by x→y ascending (stable).
 * - For 'none'/'concentric'/'coincident', `points` may be omitted or empty.
 */
export type IntersectResult = {
    kind: IntersectKind;
    points?: Vec2[];
};

/**
 * Geometry mode kind (shared across geom/render/ui)
 */
export const GEOMETRY_KIND = {
    hyperbolic: "hyperbolic",
    euclidean: "euclidean",
} as const;

export type GeometryKind = (typeof GEOMETRY_KIND)[keyof typeof GEOMETRY_KIND];

/**
 * Numeric tolerance model for floating comparisons.
 * - abs: absolute tolerance (baseline at ~1e-12)
 * - rel: relative tolerance scaled by a problem-dependent scale (eg. r1+r2)
 */
export type Tolerance = {
    abs: number;
    rel: number;
};

export const defaultTol: Tolerance = { abs: 1e-12, rel: 1e-12 };

/**
 * Compute effective tolerance for a given scale.
 */
export function tolValue(scale: number, tol: Tolerance = defaultTol): number {
    return tol.abs + tol.rel * Math.max(1, scale);
}

/**
 * Equality within tolerance at a given scale.
 */
export function eqTol(a: number, b: number, scale: number, tol: Tolerance = defaultTol): boolean {
    return Math.abs(a - b) <= tolValue(scale, tol);
}
