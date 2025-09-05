import type { Circle, IntersectResult } from "./types";

/**
 * circleCircleIntersection
 * API skeleton for TDD. Intentionally not implemented yet.
 */
export function circleCircleIntersection(a: Circle, b: Circle): IntersectResult {
    const dx = b.c.x - a.c.x;
    const dy = b.c.y - a.c.y;
    const d2 = dx * dx + dy * dy;
    const rsum = a.r + b.r;
    const rdiff = Math.abs(a.r - b.r);
    const rsum2 = rsum * rsum;
    const rdiff2 = rdiff * rdiff;

    // Same center: coincident or concentric
    if (d2 === 0) {
        if (a.r === b.r) return { kind: "coincident" };
        return { kind: "concentric" };
    }

    // Separated or contained without touching
    if (d2 > rsum2 || d2 < rdiff2) {
        return { kind: "none", points: [] };
    }

    // Tangent (external or internal)
    if (d2 === rsum2 || d2 === rdiff2) {
        return { kind: "tangent" };
    }

    // Proper intersection (two points)
    return { kind: "two" };
}
