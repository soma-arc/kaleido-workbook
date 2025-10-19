import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_DEBUG_TEXTURE_SCENE_KEY = "debugTexture" as const;

export const euclideanDebugTextureScene = {
    key: EUCLIDEAN_DEBUG_TEXTURE_SCENE_KEY,
    label: "Debug Texture",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "debug-texture",
    description: "Renders the base texture in the viewport center for shader debugging.",
    supportsHandles: false,
    editable: false,
    defaultTexturePresetId: "grid",
    embedOverlayDefaultVisible: false,
    controlsFactory: ({ defaultControls, extras }) => {
        const context = extras as {
            presetControls?: ReactNode;
            triangleControls?: ReactNode;
            handleControls?: ReactNode;
            circleInversionControls?: ReactNode;
            cameraDebugControls?: ReactNode;
        };
        return (
            <>
                {defaultControls}
                {context.presetControls}
                {context.triangleControls}
                {context.handleControls}
                {context.circleInversionControls}
                {context.cameraDebugControls}
            </>
        );
    },
} satisfies SceneDefinitionInput;
