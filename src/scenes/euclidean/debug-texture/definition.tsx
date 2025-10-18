import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_DEBUG_TEXTURE_SCENE_KEY = "debugTexture" as const;

export const euclideanDebugTextureScene = {
    key: EUCLIDEAN_DEBUG_TEXTURE_SCENE_KEY,
    label: "Debug Texture",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "debug-texture",
    description: "Renders the base texture in the viewport center for shader debugging.",
    supportsHandles: false,
    editable: false,
} satisfies SceneDefinitionInput;
