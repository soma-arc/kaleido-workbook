import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { halfPlaneFromNormalAndOffset, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_SINGLE_HALF_PLANE_SCENE_KEY = "euclideanSingleHalfPlane" as const;

const SINGLE_HALF_PLANE = [halfPlaneFromNormalAndOffset({ x: 1, y: 0 }, 0)] as const;

function cloneHalfPlanes(
    planes: readonly { anchor: { x: number; y: number }; normal: { x: number; y: number } }[],
): HalfPlane[] {
    return planes.map((plane) =>
        normalizeHalfPlane({
            anchor: { x: plane.anchor.x, y: plane.anchor.y },
            normal: { x: plane.normal.x, y: plane.normal.y },
        }),
    );
}

export const euclideanSingleHalfPlaneScene = {
    key: EUCLIDEAN_SINGLE_HALF_PLANE_SCENE_KEY,
    label: "Single Half-Plane",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "single-half-plane",
    description: "One adjustable half-plane represented with draggable handles.",
    supportsHandles: true,
    editable: true,
    supportsPanZoom: true,
    defaultHandleSpacing: 0.75,
    defaultTexturePresetId: "cat-fish-run",
    embedOverlayDefaultVisible: false,
    initialHalfPlanes: cloneHalfPlanes(SINGLE_HALF_PLANE),
    textureRectangle: {
        enabled: true,
        center: { x: 1, y: 0 },
        halfExtents: { x: 0.75, y: 0.75 },
        rotation: 0,
    },
    renderPipelineId: EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
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
