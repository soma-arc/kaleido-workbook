import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SceneDefinition, SceneId } from "./types";

export const TRIANGLE_SCENE_IDS = {
    hyperbolic: "triangle:hyperbolic" as const,
    euclidean: "triangle:euclidean" as const,
    hinge: "triangle:hinge" as const,
};

const HINGE_HALF_PLANES = [
    { normal: { x: 1, y: 0 }, offset: 0 },
    { normal: { x: 0, y: 1 }, offset: 0 },
] as const;

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
};

export const TRIANGLE_SCENE_ORDER: SceneId[] = [
    TRIANGLE_SCENE_IDS.hyperbolic,
    TRIANGLE_SCENE_IDS.euclidean,
    TRIANGLE_SCENE_IDS.hinge,
];

export const DEFAULT_TRIANGLE_SCENE_ID: SceneId = TRIANGLE_SCENE_IDS.hyperbolic;
