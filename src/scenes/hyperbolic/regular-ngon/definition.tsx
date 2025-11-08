import { GEOMETRY_KIND } from "@/geom/core/types";
import { buildHyperbolicRegularNgonScene } from "@/render/scene";
import { HYPERBOLIC_REGULAR_NGON_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { SceneDefinitionInput } from "@/ui/scenes/types";
import {
    HYPERBOLIC_REGULAR_NGON_DEFAULT_N,
    HYPERBOLIC_REGULAR_NGON_DEFAULT_Q,
    HYPERBOLIC_REGULAR_NGON_ROTATION,
    HYPERBOLIC_REGULAR_NGON_SCENE_KEY,
} from "./constants";
import {
    HyperbolicRegularNgonOverlay,
    type HyperbolicRegularNgonOverlayExtras,
} from "./ui/Overlay";

export const hyperbolicRegularNgonScene = {
    key: HYPERBOLIC_REGULAR_NGON_SCENE_KEY,
    label: "Hyperbolic Regular n-gon",
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "regular-ngon",
    description: "Displays a single regular {n, q} polygon in the Poincaré disk.",
    supportsHandles: false,
    editable: false,
    supportsPanZoom: true,
    showTriangleControls: false,
    embedOverlayDefaultVisible: true,
    renderPipelineId: HYPERBOLIC_REGULAR_NGON_PIPELINE_ID,
    hyperbolicSceneFactory: ({ viewport, textures, params }) => {
        if (params.kind !== "regularNgon") {
            throw new Error("Regular n-gon scene requires regularNgon parameters");
        }
        return buildHyperbolicRegularNgonScene(
            {
                n: params.n ?? HYPERBOLIC_REGULAR_NGON_DEFAULT_N,
                q: params.q ?? HYPERBOLIC_REGULAR_NGON_DEFAULT_Q,
                rotation: params.rotation ?? HYPERBOLIC_REGULAR_NGON_ROTATION,
            },
            viewport,
            { textures },
        );
    },
    embedOverlayFactory: ({ extras }) => {
        const overlayExtras = extras as HyperbolicRegularNgonOverlayExtras | undefined;
        if (!overlayExtras?.regularNgonOverlay) {
            return null;
        }
        return <HyperbolicRegularNgonOverlay {...overlayExtras.regularNgonOverlay} />;
    },
} satisfies SceneDefinitionInput;
