import {
    DEFAULT_SCENE_ID,
    SCENE_IDS,
    SCENE_ORDER,
    SCENES_BY_GEOMETRY,
    SCENES_BY_ID,
} from "./sceneDefinitions";
import type { SceneDefinition, SceneId, SceneRegistry } from "./types";

export const SCENE_REGISTRY: SceneRegistry = {
    byId: SCENES_BY_ID,
    order: SCENE_ORDER,
    byGeometry: SCENES_BY_GEOMETRY,
};

export function listScenes(): SceneDefinition[] {
    return SCENE_ORDER.map((id) => SCENES_BY_ID[id]);
}

export function listScenesByGeometry(geometry: SceneDefinition["geometry"]): SceneDefinition[] {
    return SCENE_REGISTRY.byGeometry[geometry];
}

export function getSceneDefinition(id: SceneId): SceneDefinition {
    const entry = SCENES_BY_ID[id];
    if (!entry) {
        throw new Error(`Unknown scene id: ${id}`);
    }
    return entry;
}

export { DEFAULT_SCENE_ID, SCENE_IDS };
