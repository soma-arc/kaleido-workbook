import type { Circle, IntersectResult, Vec } from "./types";
import { defaultTol, eqTol, tolValue } from "./types";

/**
 * circleCircleIntersection
 * API skeleton for TDD. Intentionally not implemented yet.
 */
/**
 * circleCircleIntersection
 * Computes the intersection between two circles using the standard algebraic derivation.
 *
 * Notation:
 * - Let centers be A = a.c, B = b.c, radii r1 = a.r, r2 = b.r.
 * - d = |AB|, u = (B - A) / d (unit direction from A to B).
 * - aLen = (r1^2 - r2^2 + d^2) / (2d) is the signed distance from A to the foot point P on the chord line.
 * - h^2 = r1^2 - aLen^2; if h = 0 the circles are tangent, if h > 0 there are two intersections.
 * - The base point is P = A + aLen * u, and the offsets are ±h * R(u) where R rotates by +90°.
 *
 * Branch order:
 * - coincident / concentric (same center)
 * - none (separate or containment without touching)
 * - tangent (h == 0)
 * - two (h > 0), with stable x→y ordering
 */
function distance(p: Vec, q: Vec): number {
    return Math.hypot(p.x - q.x, p.y - q.y);
}

function sortPointsAscXY(pts: Vec[]): Vec[] {
    return [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
}

export function circleCircleIntersection(a: Circle, b: Circle): IntersectResult {
    // Normalize/guard inputs
    const norm = (c: Circle): Circle | null => {
        const { x, y } = c.c;
        const r = Math.abs(c.r);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return null;
        if (!(r > 0)) return null;
        return { c: { x, y }, r };
    };
    const A = norm(a);
    const B = norm(b);
    if (!A || !B) return { kind: "none", points: [] };

    const dx = B.c.x - A.c.x;
    const dy = B.c.y - A.c.y;
    // compute distance once via helper for clarity
    const d = distance(A.c, B.c);
    const d2 = d * d;

    // Same-center guards
    const scale = A.r + B.r;
    const sameCenter = eqTol(d, 0, scale, defaultTol); // tolerant same-center check
    if (sameCenter) {
        return A.r === B.r ? { kind: "coincident" } : { kind: "concentric" };
    }

    const rsum = scale;
    const rdiff = Math.abs(A.r - B.r);
    const epsR = tolValue(rsum, defaultTol);

    // Early exit: separate or containment without touching
    if (d > rsum + epsR || d < rdiff - epsR) {
        return { kind: "none", points: [] };
    }

    // Compute intersection base using robust algebra
    // Distance from a.c to the foot of the perpendicular from intersection points
    const aLen = (A.r * A.r - B.r * B.r + d2) / (2 * d);
    // Squared height from that foot to the actual intersection(s)
    let h2 = A.r * A.r - aLen * aLen;
    // Clamp tiny negatives due to rounding to zero
    if (h2 < 0 && h2 > -1e-15) h2 = 0;
    if (h2 < 0) {
        // Numerically outside: treat as none
        return { kind: "none", points: [] };
    }

    const h = Math.sqrt(h2);
    const ux = dx / d;
    const uy = dy / d;
    const px = A.c.x + aLen * ux;
    const py = A.c.y + aLen * uy;

    const makePoint = (x: number, y: number): Vec => ({ x, y });

    if (h === 0) {
        const p = makePoint(px, py);
        return { kind: "tangent", points: [p] };
    }

    const rx = -uy * h;
    const ry = ux * h;
    const p1 = makePoint(px + rx, py + ry);
    const p2 = makePoint(px - rx, py - ry);
    const points = sortPointsAscXY([p1, p2]);
    return { kind: "two", points };
}
