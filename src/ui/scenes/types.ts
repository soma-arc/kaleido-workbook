import type { GeometryKind } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";

export type SceneCategory = "triangle";

export type SceneId =
    | "triangle:hyperbolic"
    | "triangle:euclidean"
    | "triangle:hinge"
    | "triangle:regular-square"
    | "triangle:regular-pentagon"
    | "triangle:regular-hexagon";

export interface SceneDefinition {
    id: SceneId;
    label: string;
    category: SceneCategory;
    geometry: GeometryKind;
    description?: string;
    supportsHandles: boolean;
    editable: boolean;
    allowPlaneDrag?: boolean;
    initialHalfPlanes?: HalfPlane[];
    controlAssignments?: ControlPointAssignment[];
    initialControlPoints?: HalfPlaneControlPoints[];
    defaultHandleSpacing?: number;
}

export type SceneRegistry = {
    byId: Record<SceneId, SceneDefinition>;
    order: SceneId[];
};
