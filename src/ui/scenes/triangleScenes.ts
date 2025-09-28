import { GEOMETRY_KIND } from "@/geom/core/types";
import { createRegularPolygonSceneConfig } from "./regularPolygons";
import type { SceneDefinition, SceneId } from "./types";

export const TRIANGLE_SCENE_IDS = {
    hyperbolic: "triangle:hyperbolic" as const,
    euclidean: "triangle:euclidean" as const,
    hinge: "triangle:hinge" as const,
    regularSquare: "triangle:regular-square" as const,
    regularPentagon: "triangle:regular-pentagon" as const,
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

export const TRIANGLE_SCENES: Record<SceneId, SceneDefinition> = {
    [TRIANGLE_SCENE_IDS.hyperbolic]: {
        id: TRIANGLE_SCENE_IDS.hyperbolic,
        label: "Hyperbolic Triangle",
        category: "triangle",
        geometry: GEOMETRY_KIND.hyperbolic,
        description: "Generates a {p,q,r} hyperbolic tiling rendered inside the Poincaré disk.",
        supportsHandles: false,
        editable: false,
    },
    [TRIANGLE_SCENE_IDS.euclidean]: {
        id: TRIANGLE_SCENE_IDS.euclidean,
        label: "Euclidean Half-Planes",
        category: "triangle",
        geometry: GEOMETRY_KIND.euclidean,
        description: "Interactive Euclidean mirrors derived from the current {p,q,r} triangle.",
        supportsHandles: true,
        editable: true,
    },
    [TRIANGLE_SCENE_IDS.hinge]: {
        id: TRIANGLE_SCENE_IDS.hinge,
        label: "Hinge Mirrors",
        category: "triangle",
        geometry: GEOMETRY_KIND.euclidean,
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
    [TRIANGLE_SCENE_IDS.regularSquare]: {
        id: TRIANGLE_SCENE_IDS.regularSquare,
        label: "Regular Square",
        category: "triangle",
        geometry: GEOMETRY_KIND.euclidean,
        description: "Four half-planes form a square with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_SQUARE_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_SQUARE_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_SQUARE_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_SQUARE_CONFIG.initialControlPoints),
    },
    [TRIANGLE_SCENE_IDS.regularPentagon]: {
        id: TRIANGLE_SCENE_IDS.regularPentagon,
        label: "Regular Pentagon",
        category: "triangle",
        geometry: GEOMETRY_KIND.euclidean,
        description: "Five half-planes form a regular pentagon with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_PENTAGON_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_PENTAGON_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_PENTAGON_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_PENTAGON_CONFIG.initialControlPoints),
    },
};

export const TRIANGLE_SCENE_ORDER: SceneId[] = [
    TRIANGLE_SCENE_IDS.hyperbolic,
    TRIANGLE_SCENE_IDS.euclidean,
    TRIANGLE_SCENE_IDS.hinge,
    TRIANGLE_SCENE_IDS.regularSquare,
    TRIANGLE_SCENE_IDS.regularPentagon,
];

export const DEFAULT_TRIANGLE_SCENE_ID: SceneId = TRIANGLE_SCENE_IDS.hyperbolic;
