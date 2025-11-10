import { GEOMETRY_KIND } from "@/geom/core/types";
import { HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { HyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import { createSceneId, type SceneDefinitionInput } from "@/ui/scenes/types";
import {
    HyperbolicTiling333Controls,
    type HyperbolicTiling333ControlsProps,
    HyperbolicTiling333OverlayControls,
    type HyperbolicTiling333TriangleSliderProps,
} from "./ui/Controls";

export const HYPERBOLIC_TRIPLE_REFLECTION_SCENE_KEY = "hyperbolicTripleReflection" as const;

export const HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID = createSceneId({
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "tiling-333",
});

export const hyperbolicTripleReflectionScene = {
    key: HYPERBOLIC_TRIPLE_REFLECTION_SCENE_KEY,
    label: "Hyperbolic Triple Reflection",
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "tiling-333",
    description:
        "Displays three mirrors with intersection angles (3,3,3) and colors regions by reflection parity.",
    supportsHandles: false,
    editable: false,
    supportsPanZoom: true,
    showTriangleControls: false,
    embedOverlayDefaultVisible: true,
    renderPipelineId: HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID,
    controlsFactory: ({ defaultControls, extras }) => {
        const context = extras as {
            reflectionControls?: HyperbolicTiling333ControlsProps;
        };
        if (!context?.reflectionControls) {
            return defaultControls;
        }
        return (
            <>
                {defaultControls}
                <HyperbolicTiling333Controls {...context.reflectionControls} />
            </>
        );
    },
    embedOverlayFactory: ({ controls, extras }) => {
        const context = extras as
            | {
                  reflectionControls?: HyperbolicTiling333ControlsProps;
                  triangle?: HyperbolicTriangleState;
                  triangleSliderId?: string;
              }
            | undefined;
        const triangleSlider = createTriangleSliderProps(
            context?.triangle,
            context?.triangleSliderId,
        );
        if (!context?.reflectionControls && !triangleSlider) {
            return controls ?? undefined;
        }
        return (
            <HyperbolicTiling333OverlayControls
                reflectionControls={context?.reflectionControls}
                triangleSlider={triangleSlider}
            />
        );
    },
} satisfies SceneDefinitionInput;

function createTriangleSliderProps(
    triangle: HyperbolicTriangleState | undefined,
    sliderId: string | undefined,
): HyperbolicTiling333TriangleSliderProps | undefined {
    if (!triangle || !sliderId) {
        return undefined;
    }
    const min = Math.max(3, triangle.rRange.min);
    const max = Math.min(10, triangle.rRange.max);
    if (!(max > min)) {
        return undefined;
    }
    const clamp = (value: number) => Math.min(max, Math.max(min, value));
    const step = triangle.snapEnabled ? 0.1 : Math.min(triangle.rStep, 0.1);
    const handleChange = (next: number) => {
        const clamped = clamp(next);
        if (triangle.snapEnabled) {
            triangle.setSnapEnabled(false);
        }
        triangle.applyDirectTriple({ p: 3, q: 3, r: clamped });
    };
    return {
        sliderId,
        min,
        max,
        step: Math.max(step, 0.01),
        value: triangle.idealVertexEnabled ? max : clamp(triangle.rSliderValue),
        onChange: handleChange,
        maxRepresentsInfinity: true,
        infinitySelected: triangle.idealVertexEnabled,
        onInfinityToggle: triangle.setIdealVertex,
    };
}
