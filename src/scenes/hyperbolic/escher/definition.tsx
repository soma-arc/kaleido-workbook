import { GEOMETRY_KIND } from "@/geom/core/types";
import { HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { HyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import { createSceneId, type SceneDefinitionInput } from "@/ui/scenes/types";
import { HYPERBOLIC_ESCHER_SCENE_KEY } from "./constants";
import { EscherOverlayControls } from "./ui/Overlay";

export const HYPERBOLIC_ESCHER_SCENE_ID = createSceneId({
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "escher",
});

export const hyperbolicEscherScene = {
    key: HYPERBOLIC_ESCHER_SCENE_KEY,
    label: "Escher",
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "escher",
    supportsHandles: false,
    editable: false,
    supportsPanZoom: true,
    embedOverlayDefaultVisible: true,
    showTriangleControls: false,
    renderPipelineId: HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID,
    embedOverlayFactory: ({ extras }) => {
        const context = extras as { triangle?: HyperbolicTriangleState } | undefined;
        return <EscherOverlayControls triangle={context?.triangle} />;
    },
} satisfies SceneDefinitionInput;
