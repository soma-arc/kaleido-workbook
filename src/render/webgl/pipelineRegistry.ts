import type { GeometryKind } from "@/geom/core/types";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import type { SceneDefinition, SceneId } from "@/ui/scenes/types";
import type { RenderScene } from "../scene";
import type { Viewport } from "../viewport";
import type { TextureLayer } from "./textures";

/**
 * 描画パイプラインが1フレームをレンダリングする際に受け取る環境情報。
 */
export interface WebGLPipelineRenderContext {
    sceneDefinition?: SceneDefinition;
    renderScene: RenderScene;
    viewport: Viewport;
    clipToDisk: boolean;
    textures: readonly TextureLayer[];
    canvas: HTMLCanvasElement;
    sceneUniforms?: Record<string, unknown>;
    /**
     * 動的な制御点の座標（UI状態から取得）。
     * WebGLレンダリング用の制御点描画に使用される。
     */
    halfPlaneControlPoints?: HalfPlaneControlPoints[] | null;
}

/**
 * WebGL パイプラインインスタンス。render/dispose の最低限 API のみ定義する。
 */
export interface WebGLPipelineInstance {
    render(context: WebGLPipelineRenderContext): void;
    dispose(): void;
}

interface PipelineRegistration {
    id: string;
    scope: PipelineScope;
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance;
}

type PipelineScope =
    | { kind: "scene"; id: SceneId }
    | { kind: "geometry"; geometry: GeometryKind }
    | { kind: "default" };

const scenePipelineRegistry = new Map<SceneId, PipelineRegistration>();
const geometryPipelineRegistry = new Map<GeometryKind, PipelineRegistration>();
const geometryPipelineIds = new Map<GeometryKind, string>();
let defaultPipeline: PipelineRegistration | null = null;
let defaultPipelineId: string | null = null;
const scenePipelineIds = new Map<SceneId, string>();

/**
 * パイプラインを登録するベース関数。scope に応じて内部マップへ格納する。
 */
export function registerWebGLPipeline(registration: PipelineRegistration): void {
    switch (registration.scope.kind) {
        case "scene":
            scenePipelineRegistry.set(registration.scope.id, registration);
            return;
        case "geometry":
            geometryPipelineRegistry.set(registration.scope.geometry, registration);
            return;
        case "default":
            defaultPipeline = registration;
            return;
    }
}

export function resolveWebGLPipeline(scene: SceneDefinition | undefined): PipelineRegistration {
    if (scene) {
        const byScene = scenePipelineRegistry.get(scene.id);
        if (byScene) {
            return byScene;
        }
        const byGeometry = geometryPipelineRegistry.get(scene.geometry);
        if (byGeometry) {
            return byGeometry;
        }
    }
    if (defaultPipeline) {
        return defaultPipeline;
    }
    throw new Error(
        `No WebGL pipeline registered for ${scene ? scene.id : "default"}; register a default pipeline first`,
    );
}

// Convenience helpers for common registrations

/** デフォルトパイプラインを登録するショートカット。 */
export function registerDefaultWebGLPipeline(
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    defaultPipelineId = id;
    registerWebGLPipeline({ id, scope: { kind: "default" }, factory });
}

/** ジオメトリ種別に紐づくパイプラインを登録するショートカット。 */
export function registerGeometryWebGLPipeline(
    geometry: GeometryKind,
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    const existing = geometryPipelineIds.get(geometry);
    if (existing && existing !== id) {
        throw new Error(
            `Geometry pipeline already registered for ${geometry}: ${existing}. Cannot register ${id}.`,
        );
    }
    geometryPipelineIds.set(geometry, id);
    registerWebGLPipeline({ id, scope: { kind: "geometry", geometry }, factory });
}

/** シーンID単位でパイプラインを登録するショートカット。 */
export function registerSceneWebGLPipeline(
    sceneId: SceneId,
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    const existing = scenePipelineIds.get(sceneId);
    if (existing && existing !== id) {
        throw new Error(
            `Scene pipeline already registered for ${sceneId}: ${existing}. Cannot register ${id}.`,
        );
    }
    scenePipelineIds.set(sceneId, id);
    registerWebGLPipeline({ id, scope: { kind: "scene", id: sceneId }, factory });
}

export function getRegisteredScenePipelineId(sceneId: SceneId): string | undefined {
    return scenePipelineIds.get(sceneId);
}

export function getRegisteredScenePipelineMap(): ReadonlyMap<SceneId, string> {
    return scenePipelineIds;
}

export function getRegisteredGeometryPipelineId(geometry: GeometryKind): string | undefined {
    return geometryPipelineIds.get(geometry);
}

export function getRegisteredDefaultPipelineId(): string | null {
    return defaultPipelineId;
}
