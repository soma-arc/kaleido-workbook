import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { GeometryRenderRequest } from "@/render/engine";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID } from "@/scenes/hyperbolic/tiling-333";
import {
    HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS,
    HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
    HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
} from "@/scenes/hyperbolic/tiling-333/constants";
import { ModeControls } from "@/ui/components/ModeControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TexturePicker } from "@/ui/components/texture/TexturePicker";
import { useRenderEngineWithCanvas } from "@/ui/hooks/useRenderEngine";
import { useTextureInput } from "@/ui/hooks/useTextureSource";
import type { UseTriangleParamsResult } from "@/ui/hooks/useTriangleParams";
import type {
    HyperbolicTripleReflectionUniforms,
    SceneDefinition,
    SceneId,
} from "@/ui/scenes/types";
import { SceneLayout } from "./layouts";

export type HyperbolicSceneHostProps = {
    scene: SceneDefinition;
    scenes: SceneDefinition[];
    activeSceneId: SceneId;
    onSceneChange: (id: SceneId) => void;
    triangle: UseTriangleParamsResult;
    embed?: boolean;
};

export function HyperbolicSceneHost({
    scene,
    scenes,
    activeSceneId,
    onSceneChange,
    triangle,
    embed = false,
}: HyperbolicSceneHostProps): JSX.Element {
    const { canvasRef, renderEngineRef, renderMode, ready } = useRenderEngineWithCanvas();
    const textureInput = useTextureInput();
    const sliderId = useId();
    const [maxReflections, setMaxReflections] = useState(HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS);

    const isReflectionScene = scene.id === HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID;

    useEffect(() => {
        if (isReflectionScene) {
            setMaxReflections(HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS);
        }
    }, [isReflectionScene]);

    const handleMaxReflectionsChange = useCallback((next: number) => {
        const clamped = Math.min(
            HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
            Math.max(HYPERBOLIC_TILING_333_MIN_REFLECTIONS, Math.round(next)),
        );
        setMaxReflections(clamped);
    }, []);

    useEffect(() => {
        if (scene.geometry !== GEOMETRY_KIND.hyperbolic) {
            return;
        }
        const engine = renderEngineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas || !ready) {
            return;
        }
        const request: GeometryRenderRequest = {
            geometry: GEOMETRY_KIND.hyperbolic,
            params: scene.fixedHyperbolicParams ?? triangle.params,
            scene,
            textures: textureInput.textures,
        };
        if (isReflectionScene) {
            const uniformPayload: HyperbolicTripleReflectionUniforms = {
                uMaxReflections: maxReflections,
            };
            request.sceneUniforms = uniformPayload;
        }
        engine.render(request);
    }, [
        scene,
        triangle,
        textureInput.textures,
        ready,
        renderEngineRef,
        canvasRef,
        isReflectionScene,
        maxReflections,
    ]);

    const defaultControls: ReactNode = (
        <>
            <ModeControls
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSceneChange={onSceneChange}
                renderBackend={renderMode}
            />
            <TexturePicker
                slot={TEXTURE_SLOTS.base}
                state={textureInput.slots[TEXTURE_SLOTS.base]}
                presets={textureInput.presets}
                onSelectFile={(file) => textureInput.loadFile(TEXTURE_SLOTS.base, file)}
                onSelectPreset={(id) => textureInput.loadPreset(TEXTURE_SLOTS.base, id)}
                onClear={() => textureInput.disable(TEXTURE_SLOTS.base)}
            />
        </>
    );

    const reflectionControls = isReflectionScene
        ? {
              sliderId,
              min: HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
              max: HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
              step: 1,
              value: maxReflections,
              onChange: handleMaxReflectionsChange,
          }
        : undefined;

    const controls: ReactNode = scene.controlsFactory
        ? scene.controlsFactory({
              scene,
              renderBackend: renderMode,
              defaultControls,
              extras: {
                  triangle,
                  textureInput,
                  reflectionControls,
              },
          })
        : defaultControls;

    const overlay: ReactNode | undefined = embed
        ? (scene.embedOverlayFactory?.({
              scene,
              renderBackend: renderMode,
              controls: null,
              extras: reflectionControls ? { reflectionControls } : undefined,
          }) ?? undefined)
        : undefined;

    return (
        <SceneLayout
            controls={controls}
            canvas={
                <StageCanvas
                    ref={canvasRef}
                    style={{ border: "none", width: "100%", height: "100%" }}
                />
            }
            embed={embed}
            overlay={overlay}
        />
    );
}
