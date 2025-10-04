import { useMemo } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { getSceneRegistry } from "./registry";
import type { SceneDefinition } from "./types";

export function useSceneRegistry(): {
    scenes: SceneDefinition[];
    euclideanScenes: SceneDefinition[];
    hyperbolicScenes: SceneDefinition[];
    sphericalScenes: SceneDefinition[];
} {
    const registry = useMemo(() => getSceneRegistry(), []);
    const scenes = useMemo(() => [...registry.definitions], [registry]);
    const euclideanScenes = useMemo(
        () => [...registry.byGeometry[GEOMETRY_KIND.euclidean]],
        [registry],
    );
    const hyperbolicScenes = useMemo(
        () => [...registry.byGeometry[GEOMETRY_KIND.hyperbolic]],
        [registry],
    );
    const sphericalScenes = useMemo(
        () => [...registry.byGeometry[GEOMETRY_KIND.spherical]],
        [registry],
    );
    return { scenes, euclideanScenes, hyperbolicScenes, sphericalScenes };
}
