import type { ReactNode } from "react";
import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import type { RegularPolygonOptions } from "@/geom/primitives/regularPolygon";
import type { SphericalSceneState } from "@/geom/spherical/types";
import type { TilingParams } from "@/geom/triangle/tiling";
import type { CircleInversionSceneConfig } from "./circleInversionConfig";

export type FacingMirrorSceneConfig = {
    rectangleCenter: { x: number; y: number };
    rectangleHalfExtents: { x: number; y: number };
    fallbackColor: { r: number; g: number; b: number; a: number };
};

export type MultiPlaneSceneConfig = {
    minSides: number;
    maxSides: number;
    initialSides: number;
    radius: number;
    initialAngle?: RegularPolygonOptions["initialAngle"];
};
export type SceneVariant = string;

export type SceneKey = {
    geometry: GeometryKind;
    variant: SceneVariant;
};

export type SceneId = `${GeometryKind}-${SceneVariant}`;

export type TextureRectangleConfig = {
    enabled?: boolean;
    center: { x: number; y: number };
    halfExtents: { x: number; y: number };
    rotation?: number;
};

export interface SceneDefinition {
    id: SceneId;
    key: string;
    label: string;
    geometry: GeometryKind;
    variant: SceneVariant;
    /**
     * レンダリングに利用する WebGL パイプラインの識別子。
     * `registerSceneWebGLPipeline` で登録された ID と一致する必要がある。
     */
    renderPipelineId: string;
    description?: string;
    supportsHandles: boolean;
    editable: boolean;
    /**
     * シーン初期化時に自動適用したいテクスチャプリセットの ID。
     * base スロットが空で idle の場合に適用される。
     */
    defaultTexturePresetId?: string;
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
    /**
     * embed モードでオーバーレイを初期表示するかどうか。未指定時は true。
     * ラベルのみのオーバーレイを抑制したいシーンで false を指定する。
     */
    embedOverlayDefaultVisible?: boolean;
    multiPlaneConfig?: MultiPlaneSceneConfig;
    textureRectangle?: TextureRectangleConfig;
    /**
     * コントロールパネルの内容をシーン単位でカスタマイズしたい場合に指定する。
     * defaultControls を受け取り、必要なら追加 UI を組み合わせて返せる。
     */
    controlsFactory?: (context: SceneControlsContext) => ReactNode;
}

export type SceneUniforms = Record<string, unknown>;

export interface HyperbolicTripleReflectionUniforms extends SceneUniforms {
    uMaxReflections: number;
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

export type SceneContextExtras = Record<string, unknown>;

export type SceneEmbedOverlayContext = {
    scene: SceneDefinition;
    renderBackend: "canvas" | "hybrid";
    controls: ReactNode | null;
    extras?: SceneContextExtras;
};

export type SceneControlsContext = {
    scene: SceneDefinition;
    renderBackend: "canvas" | "hybrid";
    defaultControls: ReactNode;
    extras?: SceneContextExtras;
};
