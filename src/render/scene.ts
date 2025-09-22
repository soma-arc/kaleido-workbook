import type { Geodesic } from "../geom/geodesic";
import type { HalfPlane } from "../geom/halfPlane";
import { toGeodesicHalfPlane } from "../geom/halfPlane";
import type { TilingParams } from "../geom/tiling";
import { buildTiling } from "../geom/tiling";
import type { TriangleFace } from "../geom/triangle-group";
import { type CircleSpec, geodesicSpec, type LineSpec, unitDiskSpec } from "./primitives";
import { facesToEdgeGeodesics } from "./tilingAdapter";
import type { Viewport } from "./viewport";

export type TilePrimitiveBase = {
    id: string;
    faceId: string;
    faceWord: string;
    edgeIndex: 0 | 1 | 2;
    geodesic: Geodesic;
};

export type TilePrimitive =
    | (TilePrimitiveBase & { kind: "circle"; circle: CircleSpec })
    | (TilePrimitiveBase & { kind: "line"; line: LineSpec });

export type TileScene = {
    disk: CircleSpec;
    tiles: TilePrimitive[];
};

function buildTilePrimitives(faces: TriangleFace[], vp: Viewport): TilePrimitive[] {
    const edges = facesToEdgeGeodesics(faces);
    return edges.map((edge) => {
        const spec = geodesicSpec(edge.geodesic, vp);
        const base: TilePrimitiveBase = {
            id: `${edge.faceId}:${edge.edgeIndex}`,
            faceId: edge.faceId,
            faceWord: edge.faceWord,
            edgeIndex: edge.edgeIndex,
            geodesic: edge.geodesic,
        };
        if ("r" in spec) {
            return { ...base, kind: "circle", circle: spec } as TilePrimitive;
        }
        return { ...base, kind: "line", line: spec } as TilePrimitive;
    });
}

export function buildTileScene(params: TilingParams, vp: Viewport): TileScene {
    const { faces } = buildTiling(params);
    return {
        disk: unitDiskSpec(vp),
        tiles: buildTilePrimitives(faces, vp),
    };
}

export function buildHalfPlaneScene(planes: HalfPlane[], vp: Viewport): TileScene {
    const disk = unitDiskSpec(vp);
    const tiles: TilePrimitive[] = planes.map((plane, index) => {
        const geodesic = toGeodesicHalfPlane(plane);
        const spec = geodesicSpec(geodesic, vp);
        const base: TilePrimitiveBase = {
            id: `plane-${index}`,
            faceId: `plane-${index}`,
            faceWord: "plane",
            edgeIndex: 0,
            geodesic,
        };
        if ("r" in spec) {
            return { ...base, kind: "circle", circle: spec };
        }
        return { ...base, kind: "line", line: spec };
    });
    return { disk, tiles };
}
