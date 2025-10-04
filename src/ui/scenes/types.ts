import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import type { SphericalSceneState } from "@/geom/spherical/types";

export const SCENE_VARIANT_GROUPS = {
    [GEOMETRY_KIND.hyperbolic]: ["tiling"] as const,
    [GEOMETRY_KIND.euclidean]: [
        "half-planes",
        "hinge",
        "regular-square",
        "regular-pentagon",
        "regular-hexagon",
    ] as const,
    [GEOMETRY_KIND.spherical]: ["tetrahedron"] as const,
} as const;

export type HyperbolicSceneVariant =
    (typeof SCENE_VARIANT_GROUPS)[typeof GEOMETRY_KIND.hyperbolic][number];
export type EuclideanSceneVariant =
    (typeof SCENE_VARIANT_GROUPS)[typeof GEOMETRY_KIND.euclidean][number];

export type SphericalSceneVariant =
    (typeof SCENE_VARIANT_GROUPS)[typeof GEOMETRY_KIND.spherical][number];

export type SceneVariant = HyperbolicSceneVariant | EuclideanSceneVariant | SphericalSceneVariant;

export type SceneId =
    | `${typeof GEOMETRY_KIND.hyperbolic}-${HyperbolicSceneVariant}`
    | `${typeof GEOMETRY_KIND.euclidean}-${EuclideanSceneVariant}`
    | `${typeof GEOMETRY_KIND.spherical}-${SphericalSceneVariant}`;

export type SceneKey =
    | { geometry: typeof GEOMETRY_KIND.hyperbolic; variant: HyperbolicSceneVariant }
    | { geometry: typeof GEOMETRY_KIND.euclidean; variant: EuclideanSceneVariant }
    | { geometry: typeof GEOMETRY_KIND.spherical; variant: SphericalSceneVariant };

export interface SceneDefinition {
    id: SceneId;
    label: string;
    geometry: GeometryKind;
    variant: SceneVariant;
    description?: string;
    supportsHandles: boolean;
    editable: boolean;
    allowPlaneDrag?: boolean;
    initialHalfPlanes?: HalfPlane[];
    controlAssignments?: ControlPointAssignment[];
    initialControlPoints?: HalfPlaneControlPoints[];
    defaultHandleSpacing?: number;
    initialSphericalState?: SphericalSceneState;
}

export type SceneRegistry = {
    byId: Record<SceneId, SceneDefinition>;
    order: SceneId[];
    byGeometry: Record<GeometryKind, SceneDefinition[]>;
};

export function createSceneId(key: SceneKey): SceneId {
    return `${key.geometry}-${key.variant}` as SceneId;
}

export function parseSceneId(id: SceneId): SceneKey {
    const separatorIndex = id.indexOf("-");
    if (separatorIndex === -1) {
        throw new Error(`Invalid scene id: ${id}`);
    }
    const geometry = id.slice(0, separatorIndex) as GeometryKind;
    const variant = id.slice(separatorIndex + 1) as SceneVariant;

    switch (geometry) {
        case GEOMETRY_KIND.hyperbolic: {
            if (!SCENE_VARIANT_GROUPS[geometry].includes(variant as HyperbolicSceneVariant)) {
                throw new Error(`Invalid hyperbolic scene variant: ${variant}`);
            }
            return { geometry, variant: variant as HyperbolicSceneVariant };
        }
        case GEOMETRY_KIND.euclidean: {
            if (!SCENE_VARIANT_GROUPS[geometry].includes(variant as EuclideanSceneVariant)) {
                throw new Error(`Invalid euclidean scene variant: ${variant}`);
            }
            return { geometry, variant: variant as EuclideanSceneVariant };
        }
        case GEOMETRY_KIND.spherical: {
            if (!SCENE_VARIANT_GROUPS[geometry].includes(variant as SphericalSceneVariant)) {
                throw new Error(`Invalid spherical scene variant: ${variant}`);
            }
            return { geometry, variant: variant as SphericalSceneVariant };
        }
        default: {
            throw new Error(`Unsupported geometry in scene id: ${geometry}`);
        }
    }
}
