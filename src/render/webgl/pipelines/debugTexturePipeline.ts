import {
    registerSceneWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "../pipelineRegistry";
import fragmentShaderSource from "../shaders/debugTexture.frag?raw";
import vertexShaderSource from "../shaders/geodesic.vert?raw";
import { TEXTURE_SLOTS, type TextureSlot } from "../textures";
import { getOptionalUniformLocation, getUniformLocation } from "./uniformUtils";

const BASE_PIPELINE_ID = "webgl-debug-texture";
const CAMERA_PIPELINE_ID = "webgl-debug-camera";
const EUCLIDEAN_DEBUG_TEXTURE_SCENE_ID = "euclidean-debug-texture";
const EUCLIDEAN_CAMERA_SCENE_ID = "euclidean-debug-camera";

/**
 * Minimal pipeline that blits a single texture slot to screen, used for texture and camera debugging.
 */
class DebugTexturePipeline implements WebGLPipelineInstance {
    private readonly program: WebGLProgram;
    private readonly vao: WebGLVertexArrayObject;
    private readonly vertexBuffer: WebGLBuffer;
    private readonly texture: WebGLTexture;
    private readonly targetSlot: TextureSlot;
    private readonly fallbackPixel: Uint8Array;
    private readonly uniforms: UniformLocations;
    private currentSourceId: string | null = null;
    private currentWidth = 0;
    private currentHeight = 0;

    constructor(
        private readonly gl: WebGL2RenderingContext,
        targetSlot: TextureSlot,
    ) {
        this.targetSlot = targetSlot;
        const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = linkProgram(gl, vertex, fragment);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);

        const vao = gl.createVertexArray();
        if (!vao) throw new Error("Failed to create VAO");
        this.vao = vao;
        const vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) throw new Error("Failed to create vertex buffer");
        this.vertexBuffer = vertexBuffer;

        const fullscreenTriangle = new Float32Array([-1, -1, 3, -1, -1, 3]);
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, fullscreenTriangle, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        const texture = gl.createTexture();
        if (!texture) throw new Error("Failed to create debug texture");
        this.texture = texture;
        this.fallbackPixel =
            targetSlot === TEXTURE_SLOTS.camera
                ? new Uint8Array([24, 48, 96, 255])
                : new Uint8Array([30, 30, 40, 255]);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.uniforms = resolveUniformLocations(gl, this.program);

        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform1i(this.uniforms.textureSampler, 0);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    render({ canvas, textures }: WebGLPipelineRenderContext): void {
        const gl = this.gl;
        gl.viewport(
            0,
            0,
            canvas.width || gl.drawingBufferWidth || 1,
            canvas.height || gl.drawingBufferHeight || 1,
        );
        gl.useProgram(this.program);
        gl.uniform2f(
            this.uniforms.resolution,
            canvas.width || gl.drawingBufferWidth || 1,
            canvas.height || gl.drawingBufferHeight || 1,
        );

        let hasTexture = 0;
        const targetLayer = textures.find(
            (layer) => layer.slot === this.targetSlot && layer.enabled && layer.source,
        );
        if (targetLayer?.source && (targetLayer.source.ready ?? targetLayer.source.width > 0)) {
            const source = targetLayer.source;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            if (
                this.currentSourceId !== source.id ||
                this.currentWidth !== source.width ||
                this.currentHeight !== source.height
            ) {
                this.currentSourceId = source.id;
                this.currentWidth = source.width;
                this.currentHeight = source.height;
            }
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                source.element as unknown as TexImageSource,
            );
            hasTexture = 1;
        } else {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.fallbackPixel,
            );
            hasTexture = 0;
        }
        if (this.uniforms.hasTexture) {
            gl.uniform1i(this.uniforms.hasTexture, hasTexture);
        }

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }

    dispose(): void {
        const gl = this.gl;
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteVertexArray(this.vao);
        gl.deleteProgram(this.program);
        gl.deleteTexture(this.texture);
    }
}

type UniformLocations = {
    resolution: WebGLUniformLocation;
    textureSampler: WebGLUniformLocation;
    hasTexture: WebGLUniformLocation | null;
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) ?? "Unknown error";
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info}`);
    }
    return shader;
}

function linkProgram(
    gl: WebGL2RenderingContext,
    vertex: WebGLShader,
    fragment: WebGLShader,
): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) ?? "Unknown error";
        gl.deleteProgram(program);
        throw new Error(`Program link failed: ${info}`);
    }
    return program;
}

function resolveUniformLocations(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
): UniformLocations {
    const resolution = getUniformLocation(gl, program, "uResolution");
    const textureSampler = getUniformLocation(gl, program, "uDebugTexture");
    const hasTexture = getOptionalUniformLocation(gl, program, "uHasTexture", {
        label: "DebugTexturePipeline",
    });
    return { resolution, textureSampler, hasTexture };
}

/**
 * Creates a pipeline factory that previews the given texture slot.
 */
function createDebugTexturePipeline(slot: TextureSlot) {
    return (gl: WebGL2RenderingContext, _canvas: HTMLCanvasElement): WebGLPipelineInstance =>
        new DebugTexturePipeline(gl, slot);
}

registerSceneWebGLPipeline(
    EUCLIDEAN_DEBUG_TEXTURE_SCENE_ID,
    BASE_PIPELINE_ID,
    createDebugTexturePipeline(TEXTURE_SLOTS.base),
);

registerSceneWebGLPipeline(
    EUCLIDEAN_CAMERA_SCENE_ID,
    CAMERA_PIPELINE_ID,
    createDebugTexturePipeline(TEXTURE_SLOTS.camera),
);
