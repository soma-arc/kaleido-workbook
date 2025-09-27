import { useMemo } from "react";
import { listScenes } from "./registry";
import type { SceneDefinition } from "./types";

export function useSceneRegistry(): {
    scenes: SceneDefinition[];
    triangleScenes: SceneDefinition[];
} {
    const scenes = useMemo(() => listScenes(), []);
    const triangleScenes = useMemo(
        () => scenes.filter((scene) => scene.category === "triangle"),
        [scenes],
    );
    return { scenes, triangleScenes };
}
