import { distance, perp90, safeSqrt } from "@/geom/core/math";
import type { Circle, IntersectResult, Vec2 } from "@/geom/core/types";
import { defaultTol, eqTol, INTERSECT_KIND, tolValue } from "@/geom/core/types";

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
// distance moved to math.ts

function sortPointsAscXY(pts: Vec2[]): Vec2[] {
    return [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
}

/**
 * circleCircleIntersection
 * Compute intersections of two circles via the classical formula.
 *
 * Definitions:
 * - Centers/radii: A=a.c, B=b.c, r1=A.r, r2=B.r
 * - Distance: d = |B - A| = hypot(dx, dy)
 * - Unit direction: u = (B - A) / d = (ux, uy)
 * - Foot along AB: aLen = (r1^2 - r2^2 + d^2) / (2d)
 * - Height: h = sqrt(max(0, r1^2 - aLen^2))  // tiny negatives are clamped
 * - Base point: P = A + aLen·u
 * - Intersections: P ± h·R90(u) where R90(x,y)=(-y,x)
 *
 * Classification (with tolerance scaled by r1+r2):
 * - same center → coincident if r1≈r2, else concentric
 * - d > r1+r2 (+eps) or d < |r1-r2| (-eps) → none
 * - h ≈ 0 → tangent (single point)
 * - h > 0 → two (two points, sorted x→y ascending)
 *
 * Numeric notes:
 * - Uses centralized tolerance helpers (defaultTol, tolValue, eqTol)
 * - Guards/normalizes invalid inputs (non-finite coords/radius, non-positive radius)
 */
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
    if (!A || !B) return { kind: INTERSECT_KIND.none, points: [] };

    const dx = B.c.x - A.c.x;
    const dy = B.c.y - A.c.y;
    // compute distance once via helper for clarity
    const d = distance(A.c, B.c);
    const d2 = d * d;

    // Same-center guards
    const scale = A.r + B.r;
    const sameCenter = eqTol(d, 0, scale, defaultTol); // tolerant same-center check
    if (sameCenter) {
        return A.r === B.r
            ? { kind: INTERSECT_KIND.coincident }
            : { kind: INTERSECT_KIND.concentric };
    }

    const rsum = scale;
    const rdiff = Math.abs(A.r - B.r);
    const epsR = tolValue(rsum, defaultTol);

    // Early exit: separate or containment without touching
    if (d > rsum + epsR || d < rdiff - epsR) {
        return { kind: INTERSECT_KIND.none, points: [] };
    }

    // Compute intersection base using robust algebra
    // Distance from a.c to the foot of the perpendicular from intersection points
    const aLen = (A.r * A.r - B.r * B.r + d2) / (2 * d);
    // Squared height from that foot to the actual intersection(s)
    const h2 = A.r * A.r - aLen * aLen;
    const h = safeSqrt(h2);
    if (Number.isNaN(h)) {
        // Numerically outside: treat as none
        return { kind: INTERSECT_KIND.none, points: [] };
    }
    const ux = dx / d;
    const uy = dy / d;
    const px = A.c.x + aLen * ux;
    const py = A.c.y + aLen * uy;

    const makePoint = (x: number, y: number): Vec2 => ({ x, y });

    if (h === 0) {
        const p = makePoint(px, py);
        return { kind: INTERSECT_KIND.tangent, points: [p] };
    }

    const nh = perp90({ x: ux, y: uy });
    const p1 = makePoint(px + nh.x * h, py + nh.y * h);
    const p2 = makePoint(px - nh.x * h, py - nh.y * h);
    const points = sortPointsAscXY([p1, p2]);
    return { kind: INTERSECT_KIND.two, points };
}
