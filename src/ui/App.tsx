import { useEffect, useMemo, useState } from "react";
import { detectRenderMode, type RenderMode } from "@/render/engine";
import { useTriangleParams } from "./hooks/useTriangleParams";
import { DEFAULT_SCENE_ID, getSceneDefinition, type SceneId } from "./scenes";
import { EuclideanSceneHost } from "./scenes/EuclideanSceneHost";
import { useSceneRegistry } from "./scenes/useSceneRegistry";
import { applyEmbedClass, parseSceneEmbedQuery, syncSceneEmbedQuery } from "./utils/queryParams";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

export function App(): JSX.Element {
    const [renderMode] = useState<RenderMode>(() => detectRenderMode());
    const { scenes } = useSceneRegistry();
    const fallbackSceneId = useMemo<SceneId>(() => scenes[0]?.id ?? DEFAULT_SCENE_ID, [scenes]);
    const initialQueryState = useMemo(
        () => parseSceneEmbedQuery(scenes, fallbackSceneId),
        [scenes, fallbackSceneId],
    );
    const [selectedSceneId, setSelectedSceneId] = useState<SceneId>(initialQueryState.sceneId);
    const [embed, setEmbed] = useState<boolean>(initialQueryState.embed);
    const scene = useMemo(() => getSceneDefinition(selectedSceneId), [selectedSceneId]);

    useEffect(() => {
        const next = parseSceneEmbedQuery(scenes, fallbackSceneId);
        setSelectedSceneId((prev) => (prev === next.sceneId ? prev : next.sceneId));
        setEmbed((prev) => (prev === next.embed ? prev : next.embed));
    }, [scenes, fallbackSceneId]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handler = () => {
            const next = parseSceneEmbedQuery(scenes, fallbackSceneId);
            setSelectedSceneId((prev) => (prev === next.sceneId ? prev : next.sceneId));
            setEmbed((prev) => (prev === next.embed ? prev : next.embed));
        };
        window.addEventListener("popstate", handler);
        return () => {
            window.removeEventListener("popstate", handler);
        };
    }, [scenes, fallbackSceneId]);

    useEffect(() => {
        applyEmbedClass(embed);
        return () => {
            if (embed) {
                applyEmbedClass(false);
            }
        };
    }, [embed]);

    useEffect(() => {
        syncSceneEmbedQuery(selectedSceneId, embed, fallbackSceneId);
    }, [selectedSceneId, embed, fallbackSceneId]);

    const triangleParams = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
        initialGeometryMode: scene.geometry,
    });

    return (
        <EuclideanSceneHost
            scene={scene}
            scenes={scenes}
            activeSceneId={selectedSceneId}
            onSceneChange={setSelectedSceneId}
            renderMode={renderMode}
            triangle={triangleParams}
            embed={embed}
        />
    );
}
