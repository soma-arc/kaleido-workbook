import { GEOMETRY_KIND } from "@/geom/core/types";
import { HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import { createSceneId, type SceneDefinitionInput } from "@/ui/scenes/types";
import {
    HyperbolicTripleFamilyOverlay,
    type HyperbolicTripleFamilyOverlayExtras,
} from "./ui/Overlay";

export const HYPERBOLIC_TRIPLE_FAMILY_SCENE_KEY = "hyperbolicTripleFamily" as const;

export const HYPERBOLIC_TRIPLE_FAMILY_SCENE_ID = createSceneId({
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "tiling-triple-family",
});

export const hyperbolicTripleFamilyScene = {
    key: HYPERBOLIC_TRIPLE_FAMILY_SCENE_KEY,
    label: "Hyperbolic Triple Family",
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "tiling-triple-family",
    description:
        "Displays triple reflection tilings for (3,3,r), (2,4,r), and (2,3,r) families with fixed overlay controls.",
    supportsHandles: false,
    editable: false,
    supportsPanZoom: true,
    showTriangleControls: false,
    embedOverlayDefaultVisible: true,
    renderPipelineId: HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID,
    embedOverlayFactory: ({ extras }) => {
        const context = extras as HyperbolicTripleFamilyOverlayExtras | undefined;
        if (!context?.tripleFamilyControls) {
            return null;
        }
        return <HyperbolicTripleFamilyOverlay {...context.tripleFamilyControls} />;
    },
} satisfies SceneDefinitionInput;
