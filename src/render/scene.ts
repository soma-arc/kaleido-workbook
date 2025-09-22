import type { Geodesic } from "../geom/geodesic";
import type { HalfPlane } from "../geom/halfPlane";
import { toGeodesicHalfPlane } from "../geom/halfPlane";
import type { TilingParams } from "../geom/tiling";
import { buildTiling } from "../geom/tiling";
import type { TriangleFace } from "../geom/triangle-group";
import { type CircleSpec, geodesicSpec, type LineSpec, unitDiskSpec } from "./primitives";
import { facesToEdgeGeodesics } from "./tilingAdapter";
import type { Viewport } from "./viewport";

export type GeodesicPrimitiveBase = {
    id: string;
    faceId: string;
    faceWord: string;
    edgeIndex: 0 | 1 | 2;
    geodesic: Geodesic;
};

export type GeodesicPrimitive =
    | (GeodesicPrimitiveBase & { kind: "circle"; circle: CircleSpec })
    | (GeodesicPrimitiveBase & { kind: "line"; line: LineSpec });

export type HyperbolicScene = {
    disk: CircleSpec;
    tiles: GeodesicPrimitive[];
};

function buildGeodesicPrimitives(faces: TriangleFace[], vp: Viewport): GeodesicPrimitive[] {
    const edges = facesToEdgeGeodesics(faces);
    return edges.map((edge) => {
        const spec = geodesicSpec(edge.geodesic, vp);
        const base: GeodesicPrimitiveBase = {
            id: `${edge.faceId}:${edge.edgeIndex}`,
            faceId: edge.faceId,
            faceWord: edge.faceWord,
            edgeIndex: edge.edgeIndex,
            geodesic: edge.geodesic,
        };
        if ("r" in spec) {
            return { ...base, kind: "circle", circle: spec } as GeodesicPrimitive;
        }
        return { ...base, kind: "line", line: spec } as GeodesicPrimitive;
    });
}

export function buildHyperbolicScene(params: TilingParams, vp: Viewport): HyperbolicScene {
    const { faces } = buildTiling(params);
    return {
        disk: unitDiskSpec(vp),
        tiles: buildGeodesicPrimitives(faces, vp),
    };
}

export function buildHalfPlaneScene(planes: HalfPlane[], vp: Viewport): HyperbolicScene {
    const disk = unitDiskSpec(vp);
    const tiles: GeodesicPrimitive[] = planes.map((plane, index) => {
        const geodesic = toGeodesicHalfPlane(plane);
        const spec = geodesicSpec(geodesic, vp);
        const base: GeodesicPrimitiveBase = {
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
