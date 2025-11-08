import { GEOMETRY_KIND } from "@/geom/core/types";
import { createSceneId } from "@/ui/scenes/types";

export const HYPERBOLIC_REGULAR_NGON_SCENE_KEY = "hyperbolicRegularNgon" as const;

export const HYPERBOLIC_REGULAR_NGON_SCENE_ID = createSceneId({
    geometry: GEOMETRY_KIND.hyperbolic,
    variant: "regular-ngon",
});

export const HYPERBOLIC_REGULAR_NGON_DEFAULT_N = 7;
export const HYPERBOLIC_REGULAR_NGON_DEFAULT_Q = 4;

export const HYPERBOLIC_REGULAR_NGON_N_MIN = 4;
export const HYPERBOLIC_REGULAR_NGON_N_MAX = 64;
export const HYPERBOLIC_REGULAR_NGON_Q_MIN = 3;
export const HYPERBOLIC_REGULAR_NGON_Q_MAX = 12;

export const HYPERBOLIC_REGULAR_NGON_ROTATION = 0;
