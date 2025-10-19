import { GEOMETRY_KIND } from "@/geom/core/types";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const SPHERICAL_TETRAHEDRON_SCENE_KEY = "sphericalTetrahedron" as const;

export const sphericalTetrahedronScene = {
    key: SPHERICAL_TETRAHEDRON_SCENE_KEY,
    label: "Spherical Triangle",
    geometry: GEOMETRY_KIND.spherical,
    variant: "tetrahedron",
    description: "Displays a regular tetrahedron face on the unit sphere with editable vertices.",
    supportsHandles: true,
    editable: true,
    initialSphericalState: {
        triangle: createRegularTetrahedronTriangle(0),
        handles: {},
    },
    embedOverlayDefaultVisible: false,
} satisfies SceneDefinitionInput;
