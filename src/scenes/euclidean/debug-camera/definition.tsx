import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_DEBUG_CAMERA_SCENE_KEY = "euclideanCameraDebug" as const;

export const euclideanDebugCameraScene = {
    key: EUCLIDEAN_DEBUG_CAMERA_SCENE_KEY,
    label: "Camera Texture Debug",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "debug-camera",
    description:
        "Displays the live camera texture (enable from the Camera input panel) for pipeline debugging.",
    supportsHandles: false,
    editable: false,
    embedOverlayFactory: ({ controls }) => (
        <div style={{ display: "grid", gap: "12px" }}>
            {controls}
            <p
                data-testid="camera-debug-overlay-note"
                style={{ fontSize: "0.8rem", lineHeight: 1.5, opacity: 0.85 }}
            >
                カメラ入力を有効化するとライブテクスチャのプレビューがここに表示されます。
            </p>
        </div>
    ),
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
