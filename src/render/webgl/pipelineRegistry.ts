import type { GeometryKind } from "@/geom/core/types";
import type { SceneDefinition, SceneId } from "@/ui/scenes/types";
import type { RenderScene } from "../scene";
import type { Viewport } from "../viewport";
import type { TextureLayer } from "./textures";

export interface WebGLPipelineRenderContext {
    sceneDefinition?: SceneDefinition;
    renderScene: RenderScene;
    viewport: Viewport;
    clipToDisk: boolean;
    textures: readonly TextureLayer[];
    canvas: HTMLCanvasElement;
}

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

export function registerDefaultWebGLPipeline(
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    registerWebGLPipeline({ id, scope: { kind: "default" }, factory });
}

export function registerGeometryWebGLPipeline(
    geometry: GeometryKind,
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    registerWebGLPipeline({ id, scope: { kind: "geometry", geometry }, factory });
}

export function registerSceneWebGLPipeline(
    sceneId: SceneId,
    id: string,
    factory: (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => WebGLPipelineInstance,
): void {
    registerWebGLPipeline({ id, scope: { kind: "scene", id: sceneId }, factory });
}
