import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import { euclideanCircleInversionScene } from "@/scenes/euclidean/circle-inversion";
import { euclideanDebugCameraScene } from "@/scenes/euclidean/debug-camera";
import { euclideanDebugTextureScene } from "@/scenes/euclidean/debug-texture";
import { euclideanFacingMirrorScene } from "@/scenes/euclidean/facing-mirror";
import { euclideanHalfPlanesScene } from "@/scenes/euclidean/half-planes";
import { euclideanHingeScene } from "@/scenes/euclidean/hinge";
import { euclideanMultiPlaneScene } from "@/scenes/euclidean/multi-plane";
import { euclideanSingleHalfPlaneScene } from "@/scenes/euclidean/single-half-plane";
import { hyperbolicTilingScene } from "@/scenes/hyperbolic/tiling";
import { hyperbolicTripleReflectionScene } from "@/scenes/hyperbolic/tiling-333";
import { sphericalTetrahedronScene } from "@/scenes/spherical/tetrahedron";
import {
    createSceneId,
    type SceneDefinition,
    type SceneDefinitionInput,
    type SceneId,
    type SceneRegistry,
} from "./types";

type SceneDefinitionEntry = SceneDefinitionInput & { key: SceneAlias };

const HYPERBOLIC_TILING_SCENE: SceneDefinitionEntry = {
    ...hyperbolicTilingScene,
};

const HYPERBOLIC_TRIPLE_REFLECTION_SCENE: SceneDefinitionEntry = {
    ...hyperbolicTripleReflectionScene,
};

const EUCLIDEAN_DEBUG_TEXTURE_SCENE: SceneDefinitionEntry = {
    ...euclideanDebugTextureScene,
};

const EUCLIDEAN_DEBUG_CAMERA_SCENE: SceneDefinitionEntry = {
    ...euclideanDebugCameraScene,
};

const EUCLIDEAN_HALF_PLANES_SCENE: SceneDefinitionEntry = {
    ...euclideanHalfPlanesScene,
};

const EUCLIDEAN_SINGLE_HALF_PLANE_SCENE: SceneDefinitionEntry = {
    ...euclideanSingleHalfPlaneScene,
};

const EUCLIDEAN_HINGE_SCENE: SceneDefinitionEntry = {
    ...euclideanHingeScene,
};

const EUCLIDEAN_CIRCLE_INVERSION_SCENE: SceneDefinitionEntry = {
    ...euclideanCircleInversionScene,
};

const EUCLIDEAN_MULTI_PLANE_SCENE: SceneDefinitionEntry = {
    ...euclideanMultiPlaneScene,
};

const EUCLIDEAN_FACING_MIRROR_SCENE: SceneDefinitionEntry = {
    ...euclideanFacingMirrorScene,
};

const SPHERICAL_TETRAHEDRON_SCENE: SceneDefinitionEntry = {
    ...sphericalTetrahedronScene,
};

type SceneAlias =
    | "hyperbolicTiling"
    | "hyperbolicTripleReflection"
    | "debugTexture"
    | "euclideanCameraDebug"
    | "euclideanHalfPlanes"
    | "euclideanSingleHalfPlane"
    | "euclideanHinge"
    | "euclideanCircleInversion"
    | "euclideanMultiPlane"
    | "facingMirrorRoom"
    | "sphericalTetrahedron";

const BASE_SCENE_INPUTS: SceneDefinitionEntry[] = [
    HYPERBOLIC_TILING_SCENE,
    HYPERBOLIC_TRIPLE_REFLECTION_SCENE,
    EUCLIDEAN_DEBUG_TEXTURE_SCENE,
    EUCLIDEAN_DEBUG_CAMERA_SCENE,
    EUCLIDEAN_HALF_PLANES_SCENE,
    EUCLIDEAN_SINGLE_HALF_PLANE_SCENE,
    EUCLIDEAN_HINGE_SCENE,
    EUCLIDEAN_CIRCLE_INVERSION_SCENE,
    EUCLIDEAN_MULTI_PLANE_SCENE,
    EUCLIDEAN_FACING_MIRROR_SCENE,
    SPHERICAL_TETRAHEDRON_SCENE,
];

const SCENE_DEFINITIONS: SceneDefinition[] = BASE_SCENE_INPUTS.map((entry) => ({
    ...entry,
    id: createSceneId({ geometry: entry.geometry, variant: entry.variant }),
}));

type SceneIdMap = Record<SceneAlias, SceneId>;

export const SCENE_IDS: SceneIdMap = SCENE_DEFINITIONS.reduce((acc, scene) => {
    acc[scene.key as SceneAlias] = scene.id;
    return acc;
}, {} as SceneIdMap);

export const SCENES_BY_ID: Record<SceneId, SceneDefinition> = SCENE_DEFINITIONS.reduce(
    (acc, scene) => {
        acc[scene.id] = scene;
        return acc;
    },
    {} as Record<SceneId, SceneDefinition>,
);

export const SCENES_BY_GEOMETRY: Record<GeometryKind, SceneDefinition[]> = SCENE_DEFINITIONS.reduce(
    (acc, scene) => {
        acc[scene.geometry].push(scene);
        return acc;
    },
    {
        [GEOMETRY_KIND.hyperbolic]: [] as SceneDefinition[],
        [GEOMETRY_KIND.euclidean]: [] as SceneDefinition[],
        [GEOMETRY_KIND.spherical]: [] as SceneDefinition[],
    },
);

export const SCENE_ORDER: SceneId[] = SCENE_DEFINITIONS.map((scene) => scene.id);

export const DEFAULT_SCENE_ID: SceneId = SCENE_ORDER[0];

export const SCENE_REGISTRY: SceneRegistry = {
    definitions: SCENE_DEFINITIONS,
    byId: SCENES_BY_ID,
    order: SCENE_ORDER,
    byGeometry: SCENES_BY_GEOMETRY,
};
