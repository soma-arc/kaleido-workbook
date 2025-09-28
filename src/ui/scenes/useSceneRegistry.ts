import { useMemo } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { listScenes, listScenesByGeometry } from "./registry";
import type { SceneDefinition } from "./types";

export function useSceneRegistry(): {
    scenes: SceneDefinition[];
    euclideanScenes: SceneDefinition[];
    hyperbolicScenes: SceneDefinition[];
} {
    const scenes = useMemo(() => listScenes(), []);
    const euclideanScenes = useMemo(() => listScenesByGeometry(GEOMETRY_KIND.euclidean), []);
    const hyperbolicScenes = useMemo(() => listScenesByGeometry(GEOMETRY_KIND.hyperbolic), []);
    return { scenes, euclideanScenes, hyperbolicScenes };
}
