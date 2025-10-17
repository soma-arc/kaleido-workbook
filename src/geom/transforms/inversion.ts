import type { Circle, Vec2 } from "@/geom/core/types";
import { defaultTol, tolValue } from "@/geom/core/types";

const EPS = tolValue(1, defaultTol);

export type InvertedLineImage =
    | {
          kind: "line";
          normal: Vec2;
          offset: number;
      }
    | {
          kind: "circle";
          center: Vec2;
          radius: number;
      };

/**
 * Inversion in the unit circle.
 * For p = (x, y), p' = p / |p|^2. Points on the unit circle are fixed.
 * Near the origin (|p| ≈ 0), returns the input point unchanged to avoid infinities.
 */
export function invertUnit(p: Vec2): Vec2 {
    const { x, y } = p;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { x, y };
    const r2 = x * x + y * y;
    const eps = tolValue(1, defaultTol);
    if (r2 <= eps) return { x, y };
    return { x: x / r2, y: y / r2 };
}

/**
 * Inversion in an arbitrary circle C with center c and radius r.
 * For p, define v = p - c, then p' = c + (r^2 / |v|^2) * v.
 * Points on the circle are fixed. Near the center (|v| ≈ 0), returns p unchanged.
 */
export function invertInCircle(p: Vec2, C: Circle): Vec2 {
    const vx = p.x - C.c.x;
    const vy = p.y - C.c.y;
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) return { x: p.x, y: p.y };
    const d2 = vx * vx + vy * vy;
    // Only treat the exact center as a special case; otherwise compute normally to preserve involution
    if (d2 === 0) return { x: p.x, y: p.y };
    const k = (C.r * C.r) / d2;
    return { x: C.c.x + k * vx, y: C.c.y + k * vy };
}

function circleThroughPoints(a: Vec2, b: Vec2, c: Vec2): Circle | null {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (!Number.isFinite(d) || Math.abs(d) <= EPS) {
        return null;
    }

    const aSq = a.x * a.x + a.y * a.y;
    const bSq = b.x * b.x + b.y * b.y;
    const cSq = c.x * c.x + c.y * c.y;

    const ux = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d;
    const uy = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d;

    if (!Number.isFinite(ux) || !Number.isFinite(uy)) {
        return null;
    }

    const center = { x: ux, y: uy };
    const radius = Math.hypot(center.x - a.x, center.y - a.y);
    if (!(radius > 0)) {
        return null;
    }
    return { c: center, r: radius };
}

function normalizeNormal(nx: number, ny: number): Vec2 | null {
    const len = Math.hypot(nx, ny);
    if (!(len > EPS)) return null;
    return { x: nx / len, y: ny / len };
}

export function invertLineInCircle(
    line: { start: Vec2; end: Vec2 },
    circle: Circle,
): InvertedLineImage {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const directionLength = Math.hypot(dx, dy);
    if (!(directionLength > EPS)) {
        throw new Error("Line handles must not coincide");
    }

    const normal = normalizeNormal(-dy, dx);
    if (!normal) {
        throw new Error("Failed to derive line normal");
    }

    const offset = normal.x * line.start.x + normal.y * line.start.y;
    const centerDistance = normal.x * circle.c.x + normal.y * circle.c.y - offset;

    const tol = tolValue(Math.max(1, Math.abs(offset)), defaultTol);
    if (Math.abs(centerDistance) <= tol) {
        return { kind: "line", normal, offset };
    }

    const invertedStart = invertInCircle(line.start, circle);
    const invertedEnd = invertInCircle(line.end, circle);
    const circleResult = circleThroughPoints(invertedStart, invertedEnd, circle.c);
    if (!circleResult) {
        return { kind: "line", normal, offset };
    }
    return {
        kind: "circle",
        center: circleResult.c,
        radius: circleResult.r,
    };
}
