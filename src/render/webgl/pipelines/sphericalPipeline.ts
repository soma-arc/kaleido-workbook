import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SphericalScene } from "../../scene";
import {
    createSphericalRendererWithContext,
    type SphericalRenderer,
    type SphericalRenderParams,
} from "../../spherical/renderer";
import {
    registerGeometryWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "../pipelineRegistry";

const PIPELINE_ID = "webgl-spherical";

/**
 * WebGL pipeline that defers spherical rendering to the dedicated renderer while adhering to the generic pipeline contract.
 */
class SphericalPipeline implements WebGLPipelineInstance {
    constructor(private readonly renderer: SphericalRenderer) {}

    render({ renderScene, canvas }: WebGLPipelineRenderContext): void {
        const scene = renderScene as SphericalScene;
        if (scene.geometry !== GEOMETRY_KIND.spherical) {
            return;
        }
        const params: SphericalRenderParams = {
            triangle: scene.state.triangle,
            camera: scene.camera,
            viewport: {
                width: canvas.width || canvas.clientWidth || 1,
                height: canvas.height || canvas.clientHeight || 1,
            },
            settings: scene.settings,
        };
        this.renderer.render(params);
    }

    dispose(): void {
        this.renderer.dispose();
    }
}

/**
 * Factory helper exported via the registry to create {@link SphericalPipeline} instances.
 */
function createPipeline(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
): WebGLPipelineInstance {
    const renderer = createSphericalRendererWithContext(gl, canvas);
    return new SphericalPipeline(renderer);
}

registerGeometryWebGLPipeline(GEOMETRY_KIND.spherical, PIPELINE_ID, createPipeline);
