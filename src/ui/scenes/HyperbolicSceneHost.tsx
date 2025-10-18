import type { ReactNode } from "react";
import { useEffect } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { ModeControls } from "@/ui/components/ModeControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TexturePicker } from "@/ui/components/texture/TexturePicker";
import { useRenderEngineWithCanvas } from "@/ui/hooks/useRenderEngine";
import { useTextureInput } from "@/ui/hooks/useTextureSource";
import type { UseTriangleParamsResult } from "@/ui/hooks/useTriangleParams";
import type { SceneDefinition, SceneId } from "@/ui/scenes/types";
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

    useEffect(() => {
        if (scene.geometry !== GEOMETRY_KIND.hyperbolic) {
            return;
        }
        const engine = renderEngineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas || !ready) {
            return;
        }
        engine.render({
            geometry: GEOMETRY_KIND.hyperbolic,
            params: scene.fixedHyperbolicParams ?? triangle.params,
            scene,
            textures: textureInput.textures,
        });
    }, [scene, triangle, textureInput.textures, ready, renderEngineRef, canvasRef]);

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

    const controls: ReactNode = scene.controlsFactory
        ? scene.controlsFactory({
              scene,
              renderBackend: renderMode,
              defaultControls,
              extras: {
                  triangle,
                  textureInput,
              },
          })
        : defaultControls;

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
        />
    );
}
