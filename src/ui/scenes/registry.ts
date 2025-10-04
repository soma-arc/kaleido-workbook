import { DEFAULT_SCENE_ID, SCENE_IDS, SCENE_REGISTRY } from "./sceneDefinitions";
import type { SceneDefinition, SceneId } from "./types";

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
