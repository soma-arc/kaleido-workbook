import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";

export type HalfPlaneControlPoints = [Vec2, Vec2];

const EPS = 1e-12;

function rotate90CW(v: Vec2): Vec2 {
    return { x: v.y, y: -v.x };
}

function rotate90CCW(v: Vec2): Vec2 {
    return { x: -v.y, y: v.x };
}

export function deriveHalfPlaneFromPoints(points: HalfPlaneControlPoints): HalfPlane {
    const [a, b] = points;
    const tangent = { x: b.x - a.x, y: b.y - a.y };
    const tangentLen = Math.hypot(tangent.x, tangent.y);
    if (!(tangentLen > EPS)) {
        throw new Error("Half-plane control points must not coincide");
    }
    const invLen = 1 / tangentLen;
    const normal = rotate90CW({ x: tangent.x * invLen, y: tangent.y * invLen });
    const offset = -(normal.x * a.x + normal.y * a.y);
    return normalizeHalfPlane({ normal, offset });
}

export function derivePointsFromHalfPlane(
    plane: HalfPlane,
    spacing: number,
): HalfPlaneControlPoints {
    if (!(spacing > EPS)) {
        throw new Error("Half-plane control spacing must be positive");
    }
    const unit = normalizeHalfPlane(plane);
    const origin = {
        x: -unit.offset * unit.normal.x,
        y: -unit.offset * unit.normal.y,
    };
    const tangent = rotate90CCW(unit.normal);
    return [
        origin,
        {
            x: origin.x + tangent.x * spacing,
            y: origin.y + tangent.y * spacing,
        },
    ];
}
