import { GEOMETRY_KIND } from "@/geom/core/types";
import type { Geodesic } from "@/geom/primitives/geodesic";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { TriangleFace } from "@/geom/triangle/group";
import type { TilingParams } from "@/geom/triangle/tiling";
import { buildTiling } from "@/geom/triangle/tiling";
import { type CircleSpec, geodesicSpec, type LineSpec, unitDiskSpec } from "./primitives";
import { facesToEdgeGeodesics } from "./tilingAdapter";
import type { Viewport } from "./viewport";
import type { SceneTextureLayer } from "./webgl/textures";

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

type SceneBase = {
    textures?: SceneTextureLayer[];
};

export type HyperbolicScene = SceneBase & {
    geometry: typeof GEOMETRY_KIND.hyperbolic;
    disk: CircleSpec;
    geodesics: GeodesicPrimitive[];
};

export type EuclideanScene = SceneBase & {
    geometry: typeof GEOMETRY_KIND.euclidean;
    halfPlanes: HalfPlane[];
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

export function buildHyperbolicScene(
    params: TilingParams,
    vp: Viewport,
    options: { textures?: SceneTextureLayer[] } = {},
): HyperbolicScene {
    const { faces } = buildTiling(params);
    return {
        geometry: GEOMETRY_KIND.hyperbolic,
        disk: unitDiskSpec(vp),
        geodesics: buildGeodesicPrimitives(faces, vp),
        textures: options.textures ?? [],
    };
}

export function buildEuclideanScene(
    planes: HalfPlane[],
    _vp: Viewport,
    options: { textures?: SceneTextureLayer[] } = {},
): EuclideanScene {
    return {
        geometry: GEOMETRY_KIND.euclidean,
        halfPlanes: planes.map((plane) => normalizeHalfPlane(plane)),
        textures: options.textures ?? [],
    };
}
