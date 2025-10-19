import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import { MultiPlaneOverlayControls } from "@/ui/components/MultiPlaneOverlayControls";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_MULTI_PLANE_SCENE_KEY = "euclideanMultiPlane" as const;

export const euclideanMultiPlaneScene = {
    key: EUCLIDEAN_MULTI_PLANE_SCENE_KEY,
    label: "Multi-Plane Mirrors",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "multi-plane",
    description: "Displays a configurable number of mirrors arranged as a regular polygon.",
    supportsHandles: false,
    editable: false,
    defaultTexturePresetId: "grid",
    multiPlaneConfig: {
        minSides: 3,
        maxSides: 20,
        initialSides: 4,
        radius: 0.7,
    },
    renderPipelineId: EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    embedOverlayFactory: ({ extras }) => {
        const context =
            (extras as {
                multiPlaneControls?: {
                    minSides: number;
                    maxSides: number;
                    value: number;
                    onChange: (next: number) => void;
                };
            }) ?? {};
        if (!context.multiPlaneControls) {
            return null;
        }
        const { multiPlaneControls } = context;
        return (
            <MultiPlaneOverlayControls
                minSides={multiPlaneControls.minSides}
                maxSides={multiPlaneControls.maxSides}
                value={multiPlaneControls.value}
                onChange={multiPlaneControls.onChange}
            />
        );
    },
    controlsFactory: ({ defaultControls, extras }) => {
        const context = extras as {
            multiPlaneControls?: {
                sliderId: string;
                minSides: number;
                maxSides: number;
                value: number;
                onChange: (next: number) => void;
            };
            presetControls?: ReactNode;
            triangleControls?: ReactNode;
            circleInversionControls?: ReactNode;
            cameraDebugControls?: ReactNode;
            handleControls?: ReactNode;
        };
        if (!context?.multiPlaneControls) {
            return defaultControls;
        }
        const { sliderId, minSides, maxSides, value, onChange } = context.multiPlaneControls;
        return (
            <>
                {defaultControls}
                {context.presetControls}
                {context.triangleControls}
                {context.circleInversionControls}
                {context.cameraDebugControls}
                {context.handleControls}
                <div style={{ display: "grid", gap: "4px" }}>
                    <label htmlFor={sliderId} style={{ fontWeight: 600 }}>
                        Mirrors: {value}
                    </label>
                    <input
                        id={sliderId}
                        type="range"
                        min={minSides}
                        max={maxSides}
                        step={1}
                        value={value}
                        onChange={(event) => onChange(Number(event.target.value))}
                    />
                </div>
            </>
        );
    },
} satisfies SceneDefinitionInput;
