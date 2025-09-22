import type { GeodesicHalfPlane } from "./geodesic";
import type { Transform2D } from "./reflect";
import type { Vec2 } from "./types";

export type HalfPlane = {
    normal: Vec2;
    offset: number;
};

const EPS = 1e-12;

export function normalizeHalfPlane(plane: HalfPlane): HalfPlane {
    const { normal, offset } = plane;
    const len = Math.hypot(normal.x, normal.y);
    if (!(len > EPS)) {
        throw new Error("Half-plane normal must be non-zero");
    }
    if (Math.abs(len - 1) <= EPS) {
        return plane;
    }
    const inv = 1 / len;
    return {
        normal: { x: normal.x * inv, y: normal.y * inv },
        offset: offset * inv,
    };
}

export function reflectAcrossHalfPlane(plane: HalfPlane): Transform2D {
    const unit = normalizeHalfPlane(plane);
    return (point) => {
        const dot = unit.normal.x * point.x + unit.normal.y * point.y + unit.offset;
        const scale = 2 * dot;
        return {
            x: point.x - scale * unit.normal.x,
            y: point.y - scale * unit.normal.y,
        };
    };
}

export function evaluateHalfPlane(plane: HalfPlane, point: Vec2): number {
    const unit = normalizeHalfPlane(plane);
    return unit.normal.x * point.x + unit.normal.y * point.y + unit.offset;
}

export function toGeodesicHalfPlane(plane: HalfPlane): GeodesicHalfPlane {
    const unit = normalizeHalfPlane(plane);
    return { kind: "halfPlane", normal: unit.normal, offset: unit.offset };
}
