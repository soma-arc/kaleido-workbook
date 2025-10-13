import type { GEOMETRY_KIND, GeometryKind, Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { OrientedGeodesic } from "@/geom/primitives/orientedGeodesic";

export type TrianglePrimitiveSet<B, K extends GeometryKind> = {
    kind: K;
    boundaries: [B, B, B];
    vertices: [Vec2, Vec2, Vec2];
    angles: [number, number, number];
};

export type HyperbolicTrianglePrimitives = TrianglePrimitiveSet<
    OrientedGeodesic,
    typeof GEOMETRY_KIND.hyperbolic
>;

export type EuclideanTrianglePrimitives = TrianglePrimitiveSet<
    HalfPlane,
    typeof GEOMETRY_KIND.euclidean
>;
