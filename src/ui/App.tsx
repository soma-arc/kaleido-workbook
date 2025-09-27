import { useMemo, useState } from "react";
import { detectRenderMode, type RenderMode } from "@/render/engine";
import { useTriangleParams } from "./hooks/useTriangleParams";
import { DEFAULT_SCENE_ID, getSceneDefinition, type SceneId } from "./scenes";
import { TriangleSceneHost } from "./scenes/TriangleSceneHost";
import { useSceneRegistry } from "./scenes/useSceneRegistry";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

export function App(): JSX.Element {
    const [renderMode] = useState<RenderMode>(() => detectRenderMode());
    const [selectedSceneId, setSelectedSceneId] = useState<SceneId>(DEFAULT_SCENE_ID);
    const { triangleScenes } = useSceneRegistry();
    const scene = useMemo(() => getSceneDefinition(selectedSceneId), [selectedSceneId]);

    const triangleParams = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
        initialGeometryMode: scene.geometry,
    });

    return (
        <TriangleSceneHost
            scene={scene}
            scenes={triangleScenes}
            activeSceneId={selectedSceneId}
            onSceneChange={setSelectedSceneId}
            renderMode={renderMode}
            triangle={triangleParams}
        />
    );
}
