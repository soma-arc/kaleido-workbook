import type { Vec2 } from "@/geom/core/types";
import { GEODESIC_KIND, type Geodesic } from "@/geom/primitives/geodesic";

export type OrientedCircle = {
    kind: "circle";
    center: Vec2;
    radius: number;
    /** +1 で円の外側が正、-1 で円の内側が正 */
    orientation: 1 | -1;
};

export type OrientedLine = {
    kind: "line";
    /** 境界上の任意のアンカーポイント */
    anchor: Vec2;
    /** 外向き法線（外部が正になるよう正規化された単位ベクトル） */
    normal: Vec2;
};

export type OrientedGeodesic = OrientedCircle | OrientedLine;

function normalizeOrientedCircle(boundary: OrientedCircle): OrientedCircle {
    const orientation = boundary.orientation >= 0 ? 1 : -1;
    return {
        kind: "circle",
        center: { x: boundary.center.x, y: boundary.center.y },
        radius: Math.max(boundary.radius, 0),
        orientation,
    };
}

function normalizeOrientedLine(boundary: OrientedLine): OrientedLine {
    const normalLength = Math.hypot(boundary.normal.x, boundary.normal.y) || 1;
    const inv = 1 / normalLength;
    return {
        kind: "line",
        anchor: { x: boundary.anchor.x, y: boundary.anchor.y },
        normal: { x: boundary.normal.x * inv, y: boundary.normal.y * inv },
    };
}

export function normalizeOrientedGeodesic(boundary: OrientedGeodesic): OrientedGeodesic {
    return boundary.kind === "circle"
        ? normalizeOrientedCircle(boundary)
        : normalizeOrientedLine(boundary);
}

export function orientedGeodesicSignedDistance(boundary: OrientedGeodesic, point: Vec2): number {
    if (boundary.kind === "circle") {
        const circle = normalizeOrientedCircle(boundary);
        const dx = point.x - circle.center.x;
        const dy = point.y - circle.center.y;
        const distance = Math.hypot(dx, dy);
        return circle.orientation * (distance - circle.radius);
    }
    const line = normalizeOrientedLine(boundary);
    const dx = point.x - line.anchor.x;
    const dy = point.y - line.anchor.y;
    return line.normal.x * dx + line.normal.y * dy;
}

export function orientedGeodesicToGeodesic(boundary: OrientedGeodesic): Geodesic {
    if (boundary.kind === "circle") {
        const circle = normalizeOrientedCircle(boundary);
        return {
            kind: GEODESIC_KIND.circle,
            c: { x: circle.center.x, y: circle.center.y },
            r: circle.radius,
        };
    }
    const normalised = normalizeOrientedLine(boundary);
    // Rotate normal clockwise to obtain a unit direction vector along the geodesic.
    const dir = {
        x: normalised.normal.y,
        y: -normalised.normal.x,
    };
    return {
        kind: GEODESIC_KIND.diameter,
        dir,
    };
}
