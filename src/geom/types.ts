/**
 * 2D vector in Euclidean plane.
 */
export type Vec = { x: number; y: number };

/**
 * Circle represented by center `c` and radius `r` (r > 0).
 */
export type Circle = { c: Vec; r: number };

/**
 * Intersection classification between two circles.
 */
export type IntersectKind = "none" | "tangent" | "two" | "concentric" | "coincident";

/**
 * Result of circle-circle intersection.
 * - When `kind` is 'two' or 'tangent', `points` is present.
 * - For 'two', `points` contains two points sorted by x→y ascending (stable).
 * - For 'none'/'concentric'/'coincident', `points` may be omitted or empty.
 */
export type IntersectResult = {
    kind: IntersectKind;
    points?: Vec[];
};
