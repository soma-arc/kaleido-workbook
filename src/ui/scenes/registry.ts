import {
    DEFAULT_TRIANGLE_SCENE_ID,
    TRIANGLE_SCENE_IDS,
    TRIANGLE_SCENE_ORDER,
    TRIANGLE_SCENES,
} from "./triangleScenes";
import type { SceneDefinition, SceneId, SceneRegistry } from "./types";

const SCENE_MAP: Record<SceneId, SceneDefinition> = {
    ...TRIANGLE_SCENES,
};

const SCENE_ORDER: SceneId[] = [...TRIANGLE_SCENE_ORDER];

export const DEFAULT_SCENE_ID: SceneId = DEFAULT_TRIANGLE_SCENE_ID;

export const SCENE_REGISTRY: SceneRegistry = {
    byId: SCENE_MAP,
    order: SCENE_ORDER,
};

export function listScenes(): SceneDefinition[] {
    return SCENE_ORDER.map((id) => SCENE_MAP[id]);
}

export function getSceneDefinition(id: SceneId): SceneDefinition {
    const entry = SCENE_MAP[id];
    if (!entry) {
        throw new Error(`Unknown scene id: ${id}`);
    }
    return entry;
}

export const SCENE_IDS = {
    ...TRIANGLE_SCENE_IDS,
};
