import { GEOMETRY_KIND } from "@/geom/core/types";
import { HYPERBOLIC_GEODESIC_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const HYPERBOLIC_TILING_SCENE_KEY = "hyperbolicTiling" as const;

export const hyperbolicTilingScene = {
    key: HYPERBOLIC_TILING_SCENE_KEY,
    label: "Hyperbolic Triangle",
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "tiling",
    description: "Generates a {p,q,r} hyperbolic tiling rendered inside the Poincaré disk.",
    supportsHandles: false,
    editable: false,
    renderPipelineId: HYPERBOLIC_GEODESIC_PIPELINE_ID,
} satisfies SceneDefinitionInput;
