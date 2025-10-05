import type { GeometryKind } from "@/geom/core/types";
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
let defaultPipeline: PipelineRegistration | null = null;

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
    registerWebGLPipeline({ id, scope: { kind: "default" }, factory });
}

/** ジオメトリ種別に紐づくパイプラインを登録するショートカット。 */
export function registerGeometryWebGLPipeline(
    geometry: GeometryKind,
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    registerWebGLPipeline({ id, scope: { kind: "geometry", geometry }, factory });
}

/** シーンID単位でパイプラインを登録するショートカット。 */
export function registerSceneWebGLPipeline(
    sceneId: SceneId,
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    registerWebGLPipeline({ id, scope: { kind: "scene", id: sceneId }, factory });
}
