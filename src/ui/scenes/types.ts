import type { GeometryKind } from "@/geom/core/types";

export type SceneCategory = "triangle";

export type SceneId = "triangle:hyperbolic" | "triangle:euclidean";

export interface SceneDefinition {
    id: SceneId;
    label: string;
    category: SceneCategory;
    geometry: GeometryKind;
    description?: string;
    supportsHandles: boolean;
    editable: boolean;
}

export type SceneRegistry = {
    byId: Record<SceneId, SceneDefinition>;
    order: SceneId[];
};
