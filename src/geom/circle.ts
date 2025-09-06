import type { Circle, IntersectResult, Vec } from "./types";

/**
 * circleCircleIntersection
 * API skeleton for TDD. Intentionally not implemented yet.
 */
/**
 * circleCircleIntersection
 * Computes the intersection between two circles.
 * Branches are handled in this order:
 * - coincident / concentric (same center)
 * - none (separate or containment without touching)
 * - tangent (h == 0)
 * - two (h > 0), with stable x→y ordering
 */
export function circleCircleIntersection(a: Circle, b: Circle): IntersectResult {
    const dx = b.c.x - a.c.x;
    const dy = b.c.y - a.c.y;
    const d2 = dx * dx + dy * dy;

    // Same-center guards
    const sameCenter = d2 === 0;
    if (sameCenter) {
        return a.r === b.r ? { kind: "coincident" } : { kind: "concentric" };
    }

    const rsum = a.r + b.r;
    const rdiff = Math.abs(a.r - b.r);
    const rsum2 = rsum * rsum;
    const rdiff2 = rdiff * rdiff;

    // Early exit: separate or containment without touching
    if (d2 > rsum2 || d2 < rdiff2) {
        return { kind: "none", points: [] };
    }

    // Compute intersection base using robust algebra
    const d = Math.sqrt(d2);
    // Distance from a.c to the foot of the perpendicular from intersection points
    const aLen = (a.r * a.r - b.r * b.r + d2) / (2 * d);
    // Squared height from that foot to the actual intersection(s)
    let h2 = a.r * a.r - aLen * aLen;
    // Clamp tiny negatives due to rounding to zero
    if (h2 < 0 && h2 > -1e-15) h2 = 0;
    if (h2 < 0) {
        // Numerically outside: treat as none
        return { kind: "none", points: [] };
    }

    const h = Math.sqrt(h2);
    const ux = dx / d;
    const uy = dy / d;
    const px = a.c.x + aLen * ux;
    const py = a.c.y + aLen * uy;

    const makePoint = (x: number, y: number): Vec => ({ x, y });

    if (h === 0) {
        const p = makePoint(px, py);
        return { kind: "tangent", points: [p] };
    }

    const rx = -uy * h;
    const ry = ux * h;
    const p1 = makePoint(px + rx, py + ry);
    const p2 = makePoint(px - rx, py - ry);
    const points = [p1, p2].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
    return { kind: "two", points };
}
