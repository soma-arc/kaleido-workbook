import type { Circle, IntersectResult, Vec } from "./types";

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

    // Compute intersection base using robust algebra
    const d = Math.sqrt(d2);
    // Distance from a.c to the line of intersection points along the center line
    const aLen = (a.r * a.r - b.r * b.r + d2) / (2 * d);
    // Height from that point to the intersection points
    let h2 = a.r * a.r - aLen * aLen;
    // Clamp tiny negatives due to rounding
    if (h2 < 0 && h2 > -1e-15) h2 = 0;
    if (h2 < 0) {
        // Numerically fell outside; treat as none
        return { kind: "none", points: [] };
    }
    const h = Math.sqrt(h2);

    // Base point P along the line from a.c to b.c
    const ux = dx / d;
    const uy = dy / d;
    const px = a.c.x + aLen * ux;
    const py = a.c.y + aLen * uy;

    const makePoint = (x: number, y: number): Vec => ({ x, y });

    if (h === 0) {
        // Tangent
        const p = makePoint(px, py);
        return { kind: "tangent", points: [p] };
    }

    // Two intersection points offset perpendicular to (ux,uy)
    const rx = -uy * h;
    const ry = ux * h;
    const p1 = makePoint(px + rx, py + ry);
    const p2 = makePoint(px - rx, py - ry);

    // Stable ordering: sort by x then y, ascending
    const points = [p1, p2].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
    return { kind: "two", points };
}
