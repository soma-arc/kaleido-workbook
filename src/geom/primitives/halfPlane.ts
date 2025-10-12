import type { Vec2 } from "@/geom/core/types";
import type { GeodesicHalfPlane } from "@/geom/primitives/geodesic";
import { GEODESIC_KIND } from "@/geom/primitives/geodesic";
import type { Transform2D } from "@/geom/transforms/reflect";

const EPS = 1e-12;

export type HalfPlane = {
    /** 任意の境界上アンカー点（点 P）。 */
    anchor: Vec2;
    /**
     * Half-plane の外向き法線ベクトル。
     * normalize 後は単位長となり、法線方向が外側（正側）を表す。
     */
    normal: Vec2;
};

/**
 * Half-plane を正規化して、単位法線と有限アンカーを保証する。
 */
export function normalizeHalfPlane(plane: HalfPlane): HalfPlane {
    const { normal, anchor } = plane;
    const len = Math.hypot(normal.x, normal.y);
    if (!(len > EPS)) {
        throw new Error("Half-plane normal must be non-zero");
    }
    if (Math.abs(len - 1) <= EPS) {
        return {
            anchor: { x: anchor.x, y: anchor.y },
            normal,
        };
    }
    const inv = 1 / len;
    return {
        anchor: { x: anchor.x, y: anchor.y },
        normal: { x: normal.x * inv, y: normal.y * inv },
    };
}

/**
 * Half-plane の signed offset（法線と原点の距離符号付き）を計算する。
 */
export function halfPlaneOffset(plane: HalfPlane): number {
    const unit = normalizeHalfPlane(plane);
    return -(unit.normal.x * unit.anchor.x + unit.normal.y * unit.anchor.y);
}

/**
 * 旧来の (normal, offset) 表現から anchor + normal へ変換する。
 */
export function halfPlaneFromNormalAndOffset(normal: Vec2, offset: number): HalfPlane {
    const len = Math.hypot(normal.x, normal.y);
    if (!(len > EPS)) {
        throw new Error("Half-plane normal must be non-zero");
    }
    const inv = 1 / len;
    const unitNormal = { x: normal.x * inv, y: normal.y * inv } as const;
    const anchor = {
        x: -offset * unitNormal.x,
        y: -offset * unitNormal.y,
    };
    return {
        anchor,
        normal: unitNormal,
    };
}

/**
 * Half-plane へ点を鏡映する 2D 変換を構築する。
 */
export function reflectAcrossHalfPlane(plane: HalfPlane): Transform2D {
    const unit = normalizeHalfPlane(plane);
    return (point) => {
        const distance = evaluateHalfPlane(unit, point);
        const scale = 2 * distance;
        return {
            x: point.x - scale * unit.normal.x,
            y: point.y - scale * unit.normal.y,
        };
    };
}

/**
 * Half-plane に対する点の符号付き距離を返す。境界上で 0、法線方向で正。
 */
export function evaluateHalfPlane(plane: HalfPlane, point: Vec2): number {
    const unit = normalizeHalfPlane(plane);
    const dx = point.x - unit.anchor.x;
    const dy = point.y - unit.anchor.y;
    return unit.normal.x * dx + unit.normal.y * dy;
}

export function toGeodesicHalfPlane(plane: HalfPlane): GeodesicHalfPlane {
    const unit = normalizeHalfPlane(plane);
    return {
        kind: GEODESIC_KIND.halfPlane,
        normal: unit.normal,
        offset: halfPlaneOffset(unit),
    };
}
