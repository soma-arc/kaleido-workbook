import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import type { SphericalSceneState } from "@/geom/spherical/types";
import { createRegularPolygonSceneConfig } from "./regularPolygons";
import {
    createSceneId,
    type SceneDefinition,
    type SceneDefinitionInput,
    type SceneId,
    type SceneRegistry,
} from "./types";

const HINGE_HALF_PLANES = [
    { normal: { x: 1, y: 0 }, offset: 0 },
    { normal: { x: 0, y: 1 }, offset: 0 },
] as const;

const REGULAR_SQUARE_CONFIG = createRegularPolygonSceneConfig({
    sides: 4,
    radius: 0.7,
    initialAngle: Math.PI / 4,
});

const REGULAR_PENTAGON_CONFIG = createRegularPolygonSceneConfig({
    sides: 5,
    radius: 0.7,
    initialAngle: Math.PI / 2,
});

const REGULAR_HEXAGON_CONFIG = createRegularPolygonSceneConfig({
    sides: 6,
    radius: 0.7,
    initialAngle: Math.PI / 6,
});

function cloneHalfPlanes(planes: readonly { normal: { x: number; y: number }; offset: number }[]) {
    return planes.map((plane) => ({
        normal: { x: plane.normal.x, y: plane.normal.y },
        offset: plane.offset,
    }));
}

function cloneControlPointsList(
    controlPoints: readonly [
        { id: string; x: number; y: number; fixed: boolean },
        { id: string; x: number; y: number; fixed: boolean },
    ][],
): [
    { id: string; x: number; y: number; fixed: boolean },
    { id: string; x: number; y: number; fixed: boolean },
][] {
    return controlPoints.map((pair) => [
        { id: pair[0].id, x: pair[0].x, y: pair[0].y, fixed: pair[0].fixed },
        { id: pair[1].id, x: pair[1].x, y: pair[1].y, fixed: pair[1].fixed },
    ]);
}

type SceneDefinitionEntry = SceneDefinitionInput & { key: SceneAlias };

type SceneAlias =
    | "hyperbolicTiling"
    | "debugTexture"
    | "euclideanCameraDebug"
    | "euclideanHalfPlanes"
    | "euclideanHinge"
    | "euclideanRegularSquare"
    | "euclideanRegularPentagon"
    | "euclideanRegularHexagon"
    | "sphericalTetrahedron";

const BASE_SCENE_INPUTS: SceneDefinitionEntry[] = [
    {
        key: "hyperbolicTiling",
        label: "Hyperbolic Triangle",
        geometry: GEOMETRY_KIND.hyperbolic,
        variant: "tiling",
        description: "Generates a {p,q,r} hyperbolic tiling rendered inside the Poincaré disk.",
        supportsHandles: false,
        editable: false,
    },
    {
        key: "debugTexture",
        label: "Debug Texture",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "debug-texture",
        description: "Renders the base texture in the viewport center for shader debugging.",
        supportsHandles: false,
        editable: false,
    },
    {
        key: "euclideanCameraDebug",
        label: "Camera Texture Debug",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "debug-camera",
        description:
            "Displays the live camera texture (enable from the Camera input panel) for pipeline debugging.",
        supportsHandles: false,
        editable: false,
    },
    {
        key: "euclideanHalfPlanes",
        label: "Euclidean Half-Planes",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "half-planes",
        description: "Interactive Euclidean mirrors derived from the current {p,q,r} triangle.",
        supportsHandles: true,
        editable: true,
    },
    {
        key: "euclideanHinge",
        label: "Hinge Mirrors",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "hinge",
        description: "Two mirrors share a fixed hinge; drag the free endpoints to rotate them.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        initialHalfPlanes: HINGE_HALF_PLANES.map((plane) => ({
            normal: { ...plane.normal },
            offset: plane.offset,
        })),
        controlAssignments: [
            { planeIndex: 0, pointIndex: 0, id: "hinge", fixed: true },
            { planeIndex: 1, pointIndex: 0, id: "hinge", fixed: true },
        ],
    },
    {
        key: "euclideanRegularSquare",
        label: "Regular Square",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-square",
        description: "Four half-planes form a square with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_SQUARE_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_SQUARE_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_SQUARE_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_SQUARE_CONFIG.initialControlPoints),
    },
    {
        key: "euclideanRegularPentagon",
        label: "Regular Pentagon",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-pentagon",
        description: "Five half-planes form a regular pentagon with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_PENTAGON_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_PENTAGON_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_PENTAGON_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_PENTAGON_CONFIG.initialControlPoints),
    },
    {
        key: "euclideanRegularHexagon",
        label: "Regular Hexagon",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-hexagon",
        description: "Six half-planes form a regular hexagon with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_HEXAGON_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_HEXAGON_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_HEXAGON_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_HEXAGON_CONFIG.initialControlPoints),
    },
    {
        key: "sphericalTetrahedron",
        label: "Spherical Triangle",
        geometry: GEOMETRY_KIND.spherical,
        variant: "tetrahedron",
        description:
            "Displays a regular tetrahedron face on the unit sphere with editable vertices.",
        supportsHandles: true,
        editable: true,
        initialSphericalState: {
            triangle: createRegularTetrahedronTriangle(0),
            handles: {},
        } satisfies SphericalSceneState,
    },
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
