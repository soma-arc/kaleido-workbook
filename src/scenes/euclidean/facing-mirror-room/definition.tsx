import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { FacingMirrorSceneConfig, SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_FACING_MIRROR_SCENE_KEY = "facingMirrorRoom" as const;

const FACING_MIRROR_HALF_PLANES = [
    normalizeHalfPlane({ anchor: { x: -0.5, y: 0 }, normal: { x: 1, y: 0 } }),
    normalizeHalfPlane({ anchor: { x: 0.5, y: 0 }, normal: { x: -1, y: 0 } }),
] as const;

const FACING_MIRROR_CONFIG: FacingMirrorSceneConfig = {
    rectangleCenter: { x: 0, y: 0 },
    rectangleHalfExtents: { x: 0.25, y: 0.25 },
    fallbackColor: { r: 0.86, g: 0.89, b: 0.96, a: 0.95 },
};

function cloneFacingMirrorConfig(config: FacingMirrorSceneConfig): FacingMirrorSceneConfig {
    return {
        rectangleCenter: { ...config.rectangleCenter },
        rectangleHalfExtents: { ...config.rectangleHalfExtents },
        fallbackColor: { ...config.fallbackColor },
    };
}

export const euclideanFacingMirrorScene = {
    key: EUCLIDEAN_FACING_MIRROR_SCENE_KEY,
    label: "Facing Mirrors",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "facing-mirror-room",
    description:
        "Displays two opposing mirrors with a central square panel that can display textures.",
    supportsHandles: false,
    editable: false,
    allowPlaneDrag: false,
    initialHalfPlanes: FACING_MIRROR_HALF_PLANES.map((plane) => normalizeHalfPlane(plane)),
    facingMirrorConfig: cloneFacingMirrorConfig(FACING_MIRROR_CONFIG),
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
