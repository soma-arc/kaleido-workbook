import type { Vec2 } from "@/geom/core/types";
import type { Geodesic } from "@/geom/primitives/geodesic";
import type { HalfPlane } from "@/geom/primitives/halfPlane";

export type TrianglePrimitiveSet<M, K extends "hyperbolic" | "euclidean"> = {
    kind: K;
    mirrors: [M, M, M];
    vertices: [Vec2, Vec2, Vec2];
    angles: [number, number, number];
};

export type HyperbolicTrianglePrimitives = TrianglePrimitiveSet<Geodesic, "hyperbolic">;

export type EuclideanTrianglePrimitives = TrianglePrimitiveSet<HalfPlane, "euclidean">;
