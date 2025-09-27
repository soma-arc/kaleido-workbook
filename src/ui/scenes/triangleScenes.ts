import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SceneDefinition, SceneId } from "./types";

export const TRIANGLE_SCENE_IDS = {
    hyperbolic: "triangle:hyperbolic" as const,
    euclidean: "triangle:euclidean" as const,
};

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
};

export const TRIANGLE_SCENE_ORDER: SceneId[] = [
    TRIANGLE_SCENE_IDS.hyperbolic,
    TRIANGLE_SCENE_IDS.euclidean,
];

export const DEFAULT_TRIANGLE_SCENE_ID: SceneId = TRIANGLE_SCENE_IDS.hyperbolic;
