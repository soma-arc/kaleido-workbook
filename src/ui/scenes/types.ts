import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import type { SphericalSceneState } from "@/geom/spherical/types";
import type { CircleInversionSceneConfig } from "./circleInversionConfig";

export type SceneVariant = string;

export type SceneKey = {
    geometry: GeometryKind;
    variant: SceneVariant;
};

export type SceneId = `${GeometryKind}-${SceneVariant}`;

export interface SceneDefinition {
    id: SceneId;
    key: string;
    label: string;
    geometry: GeometryKind;
    variant: SceneVariant;
    description?: string;
    supportsHandles: boolean;
    editable: boolean;
    allowPlaneDrag?: boolean;
    initialHalfPlanes?: HalfPlane[];
    controlAssignments?: ControlPointAssignment[];
    initialControlPoints?: HalfPlaneControlPoints[];
    defaultHandleSpacing?: number;
    initialSphericalState?: SphericalSceneState;
    inversionConfig?: CircleInversionSceneConfig;
}

export type SceneDefinitionInput = Omit<SceneDefinition, "id">;

export type SceneRegistry = {
    definitions: SceneDefinition[];
    byId: Record<SceneId, SceneDefinition>;
    order: SceneId[];
    byGeometry: Record<GeometryKind, SceneDefinition[]>;
};

export function createSceneId(key: SceneKey): SceneId {
    return `${key.geometry}-${key.variant}` as SceneId;
}

export function parseSceneId(id: string): SceneKey {
    const separatorIndex = id.indexOf("-");
    if (separatorIndex === -1) {
        throw new Error(`Invalid scene id: ${id}`);
    }
    const geometryValue = id.slice(0, separatorIndex);
    if (!isGeometryKind(geometryValue)) {
        throw new Error(`Unsupported geometry in scene id: ${geometryValue}`);
    }
    const variant = id.slice(separatorIndex + 1);
    if (!variant) {
        throw new Error(`Missing variant in scene id: ${id}`);
    }
    return { geometry: geometryValue, variant };
}

function isGeometryKind(value: string): value is GeometryKind {
    return (
        value === GEOMETRY_KIND.hyperbolic ||
        value === GEOMETRY_KIND.euclidean ||
        value === GEOMETRY_KIND.spherical
    );
}
