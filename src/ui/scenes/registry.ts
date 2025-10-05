import { DEFAULT_SCENE_ID, SCENE_IDS, SCENE_REGISTRY } from "./sceneDefinitions";
import type { SceneDefinition, SceneId, SceneRegistry } from "./types";

/** Returns the canonical scene registry built from definitions. */
export function getSceneRegistry(): SceneRegistry {
    return SCENE_REGISTRY;
}

export function listScenes(): SceneDefinition[] {
    return SCENE_REGISTRY.order.map((id) => {
        const entry = SCENE_REGISTRY.byId[id];
        if (!entry) {
            throw new Error(`Unknown scene id: ${id}`);
        }
        return entry;
    });
}

export function listScenesByGeometry(geometry: SceneDefinition["geometry"]): SceneDefinition[] {
    return SCENE_REGISTRY.byGeometry[geometry];
}

export function getSceneDefinition(id: SceneId): SceneDefinition {
    const entry = SCENE_REGISTRY.byId[id];
    if (!entry) {
        throw new Error(`Unknown scene id: ${id}`);
    }
    return entry;
}

export { DEFAULT_SCENE_ID, SCENE_IDS };
