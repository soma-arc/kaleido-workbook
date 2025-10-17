import type { ReactNode } from "react";
import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import type { SphericalSceneState } from "@/geom/spherical/types";
import type { TilingParams } from "@/geom/triangle/tiling";
import type { CircleInversionSceneConfig } from "./circleInversionConfig";

export type FacingMirrorSceneConfig = {
    rectangleCenter: { x: number; y: number };
    rectangleHalfExtents: { x: number; y: number };
    fallbackColor: { r: number; g: number; b: number; a: number };
};

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
    /**
     * 固定構成の合わせ鏡シーンで利用する静的設定。矩形の位置・サイズやフォールバック色を保持する。
     */
    facingMirrorConfig?: FacingMirrorSceneConfig;
    /**
     * 固定のハイパーボリック三角形パラメータを利用したい場合に指定する。
     * 指定時は UI 側のパラメータフォームを非表示にし、レンダリングはこの値で行う。
     */
    fixedHyperbolicParams?: TilingParams;
    /**
     * 三角形パラメータフォームを表示するかどうか。未指定時は true。
     */
    showTriangleControls?: boolean;
    /**
     * embed モード時にキャンバス上へ表示するオーバーレイ UI をシーンごとにカスタマイズしたい場合に指定する。
     * 実装しない場合はホスト側が用意した既定 UI が利用される。
     */
    embedOverlayFactory?: (context: SceneEmbedOverlayContext) => ReactNode;
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

export type SceneEmbedOverlayContext = {
    scene: SceneDefinition;
    renderBackend: "canvas" | "hybrid";
    controls: ReactNode;
    extras?: unknown;
};
