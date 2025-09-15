import type { FundamentalTriangle } from "./triangle-fundamental";
import { buildFundamentalTriangle } from "./triangle-fundamental";
import { expandTriangleGroup, type TriangleFace } from "./triangle-group";

export type TilingParams = { p: number; q: number; r: number; depth: number };

export function buildTiling(params: TilingParams): {
    faces: TriangleFace[];
    stats: { depth: number; total: number };
} {
    const base: FundamentalTriangle = buildFundamentalTriangle(params.p, params.q, params.r);
    const { faces, stats } = expandTriangleGroup(base, params.depth);
    return { faces, stats: { depth: stats.depth, total: faces.length } };
}
