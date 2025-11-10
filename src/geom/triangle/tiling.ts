import { expandHyperbolicTriangleGroup, type TriangleFace } from "@/geom/triangle/group";
import { buildHyperbolicTriangle } from "@/geom/triangle/hyperbolicTriangle";
import type { HyperbolicTrianglePrimitives } from "@/geom/triangle/types";

export type TilingParams = { p: number; q: number; r: number; depth: number };

export function buildTiling(params: TilingParams): {
    base: HyperbolicTrianglePrimitives;
    faces: TriangleFace[];
    stats: { depth: number; total: number };
} {
    const base: HyperbolicTrianglePrimitives = buildHyperbolicTriangle(
        params.p,
        params.q,
        params.r,
        { allowIdeal: true },
    );
    const { faces, stats } = expandHyperbolicTriangleGroup(base, params.depth);
    return { base, faces, stats: { depth: stats.depth, total: faces.length } };
}
