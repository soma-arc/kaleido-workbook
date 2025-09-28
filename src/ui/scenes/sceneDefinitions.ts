import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import { createRegularPolygonSceneConfig } from "./regularPolygons";
import { createSceneId, type SceneDefinition, type SceneId } from "./types";

type SceneIdMap = {
    hyperbolicTiling: SceneId;
    euclideanHalfPlanes: SceneId;
    euclideanHinge: SceneId;
    euclideanRegularSquare: SceneId;
    euclideanRegularPentagon: SceneId;
    euclideanRegularHexagon: SceneId;
};

export const SCENE_IDS: SceneIdMap = {
    hyperbolicTiling: createSceneId({ geometry: GEOMETRY_KIND.hyperbolic, variant: "tiling" }),
    euclideanHalfPlanes: createSceneId({
        geometry: GEOMETRY_KIND.euclidean,
        variant: "half-planes",
    }),
    euclideanHinge: createSceneId({ geometry: GEOMETRY_KIND.euclidean, variant: "hinge" }),
    euclideanRegularSquare: createSceneId({
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-square",
    }),
    euclideanRegularPentagon: createSceneId({
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-pentagon",
    }),
    euclideanRegularHexagon: createSceneId({
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-hexagon",
    }),
};

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

const HYPERBOLIC_SCENES: SceneDefinition[] = [
    {
        id: SCENE_IDS.hyperbolicTiling,
        label: "Hyperbolic Triangle",
        geometry: GEOMETRY_KIND.hyperbolic,
        variant: "tiling",
        description: "Generates a {p,q,r} hyperbolic tiling rendered inside the Poincaré disk.",
        supportsHandles: false,
        editable: false,
    },
];

const EUCLIDEAN_SCENES: SceneDefinition[] = [
    {
        id: SCENE_IDS.euclideanHalfPlanes,
        label: "Euclidean Half-Planes",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "half-planes",
        description: "Interactive Euclidean mirrors derived from the current {p,q,r} triangle.",
        supportsHandles: true,
        editable: true,
    },
    {
        id: SCENE_IDS.euclideanHinge,
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
        id: SCENE_IDS.euclideanRegularSquare,
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
        id: SCENE_IDS.euclideanRegularPentagon,
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
        id: SCENE_IDS.euclideanRegularHexagon,
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
];

export const SCENES_BY_GEOMETRY: Record<GeometryKind, SceneDefinition[]> = {
    [GEOMETRY_KIND.hyperbolic]: HYPERBOLIC_SCENES,
    [GEOMETRY_KIND.euclidean]: EUCLIDEAN_SCENES,
};

export const SCENES_BY_ID: Record<SceneId, SceneDefinition> = Object.fromEntries(
    [...HYPERBOLIC_SCENES, ...EUCLIDEAN_SCENES].map((scene) => [scene.id, scene]),
) as Record<SceneId, SceneDefinition>;

export const SCENE_ORDER: SceneId[] = [
    SCENE_IDS.hyperbolicTiling,
    SCENE_IDS.euclideanHalfPlanes,
    SCENE_IDS.euclideanHinge,
    SCENE_IDS.euclideanRegularSquare,
    SCENE_IDS.euclideanRegularPentagon,
    SCENE_IDS.euclideanRegularHexagon,
];

export const DEFAULT_SCENE_ID: SceneId = SCENE_IDS.hyperbolicTiling;
