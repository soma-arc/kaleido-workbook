import type { GEOMETRY_KIND, GeometryKind, Vec2 } from "@/geom/core/types";
import type { Geodesic } from "@/geom/primitives/geodesic";
import type { HalfPlane } from "@/geom/primitives/halfPlane";

export type TrianglePrimitiveSet<M, K extends GeometryKind> = {
    kind: K;
    mirrors: [M, M, M];
    vertices: [Vec2, Vec2, Vec2];
    angles: [number, number, number];
};

export type HyperbolicTrianglePrimitives = TrianglePrimitiveSet<
    Geodesic,
    typeof GEOMETRY_KIND.hyperbolic
>;

export type EuclideanTrianglePrimitives = TrianglePrimitiveSet<
    HalfPlane,
    typeof GEOMETRY_KIND.euclidean
>;
