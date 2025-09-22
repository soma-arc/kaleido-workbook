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
    geometry: "hyperbolic";
    disk: CircleSpec;
    geodesics: GeodesicPrimitive[];
};

export type EuclideanScene = {
    geometry: "euclidean";
    geodesics: GeodesicPrimitive[];
};

export type RenderScene = HyperbolicScene | EuclideanScene;

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
        geometry: "hyperbolic",
        disk: unitDiskSpec(vp),
        geodesics: buildGeodesicPrimitives(faces, vp),
    };
}

export function buildEuclideanScene(planes: HalfPlane[], vp: Viewport): EuclideanScene {
    const geodesics: GeodesicPrimitive[] = planes.map((plane, index) => {
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
    return { geometry: "euclidean", geodesics };
}
