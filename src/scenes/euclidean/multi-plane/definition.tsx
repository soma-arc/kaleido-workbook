import { GEOMETRY_KIND } from "@/geom/core/types";
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
    multiPlaneConfig: {
        minSides: 3,
        maxSides: 20,
        initialSides: 4,
        radius: 0.7,
    },
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
} satisfies SceneDefinitionInput;
