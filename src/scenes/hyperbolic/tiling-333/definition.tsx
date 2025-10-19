import { GEOMETRY_KIND } from "@/geom/core/types";
import { createSceneId, type SceneDefinitionInput } from "@/ui/scenes/types";
import {
    HyperbolicTiling333Controls,
    type HyperbolicTiling333ControlsProps,
    HyperbolicTiling333OverlayControls,
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
    fixedHyperbolicParams: { p: 3, q: 3, r: 3, depth: 0 },
    showTriangleControls: false,
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
        const context = extras as {
            reflectionControls?: HyperbolicTiling333ControlsProps;
        };
        if (!context?.reflectionControls) {
            return controls;
        }
        return <HyperbolicTiling333OverlayControls {...context.reflectionControls} />;
    },
} satisfies SceneDefinitionInput;
