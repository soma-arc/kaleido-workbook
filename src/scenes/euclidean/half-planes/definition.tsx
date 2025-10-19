import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import { HalfPlaneOverlayControls } from "@/ui/components/HalfPlaneOverlayControls";
import type { SceneDefinitionInput } from "@/ui/scenes/types";
import type { TrianglePreset, TrianglePresetGroup } from "@/ui/trianglePresets";

export const EUCLIDEAN_HALF_PLANES_SCENE_KEY = "euclideanHalfPlanes" as const;

export const euclideanHalfPlanesScene = {
    key: EUCLIDEAN_HALF_PLANES_SCENE_KEY,
    label: "Euclidean Half-Planes",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "half-planes",
    description: "Interactive Euclidean mirrors derived from the current {p,q,r} triangle.",
    supportsHandles: true,
    editable: true,
    defaultTexturePresetId: "grid",
    renderPipelineId: EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    embedOverlayFactory: ({ controls, extras }) => {
        const context = (extras as {
            showHandles?: boolean;
            toggleHandles?: () => void;
            halfPlaneControls?: {
                presetGroups: readonly TrianglePresetGroup[];
                activePresetId?: string;
                selectPreset: (preset: TrianglePreset) => void;
                snapEnabled: boolean;
                setSnapEnabled: (enabled: boolean) => void;
            };
        }) ?? { showHandles: false };
        if (!context.halfPlaneControls) {
            return controls ?? null;
        }
        const { halfPlaneControls } = context;
        const toggleHandles = context.toggleHandles ?? (() => {});
        return (
            <HalfPlaneOverlayControls
                presetGroups={halfPlaneControls.presetGroups}
                activePresetId={halfPlaneControls.activePresetId}
                onSelectPreset={halfPlaneControls.selectPreset}
                snapEnabled={halfPlaneControls.snapEnabled}
                onSnapToggle={halfPlaneControls.setSnapEnabled}
                showHandles={context.showHandles ?? false}
                onToggleHandles={toggleHandles}
            />
        );
    },
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
