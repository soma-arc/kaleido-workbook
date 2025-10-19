import { GEOMETRY_KIND } from "@/geom/core/types";
import {
    createGeodesicUniformBuffers,
    MAX_UNIFORM_GEODESICS,
    packSceneGeodesics,
} from "@/render/webgl/geodesicUniforms";
import {
    registerSceneWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "@/render/webgl/pipelineRegistry";
import { getUniformLocation } from "@/render/webgl/pipelines/uniformUtils";
import vertexShaderSource from "@/render/webgl/shaders/geodesic.vert?raw";
import fragmentShaderSourceTemplate from "@/render/webgl/shaders/hyperbolicTripleReflection.frag?raw";
import { createTextureManager, type TextureManager } from "@/render/webgl/textureManager";
import { MAX_TEXTURE_SLOTS } from "@/render/webgl/textures";
import type { HyperbolicTripleReflectionUniforms } from "@/ui/scenes/types";
import {
    HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS,
    HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
    HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
} from "./constants";
import { HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID } from "./definition";

const LINE_WIDTH = 1.5;
const LINE_FEATHER = 0.9;
const LINE_COLOR = [0.92, 0.96, 0.99] as const;
const FILL_COLOR = [0.18, 0.22, 0.35] as const;
const REFLECTION_SLIDER_STEP = 1;

export const HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID =
    "webgl-hyperbolic-triple-reflection" as const;

class HyperbolicTripleReflectionPipeline implements WebGLPipelineInstance {
    private readonly gl: WebGL2RenderingContext;
    private readonly program: WebGLProgram;
    private readonly vao: WebGLVertexArrayObject;
    private readonly vertexBuffer: WebGLBuffer;
    private readonly textureManager: TextureManager;
    private readonly geodesicBuffers = createGeodesicUniformBuffers(MAX_UNIFORM_GEODESICS);
    private readonly uniforms: UniformLocations;
    private maxReflections = HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentShaderSource());
        this.program = linkProgram(gl, vertexShader, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

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

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.uniforms = resolveUniformLocations(gl, this.program);
        this.textureManager = createTextureManager(gl);

        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform1f(getUniformLocation(gl, this.program, "uLineWidth"), LINE_WIDTH);
        gl.uniform1f(getUniformLocation(gl, this.program, "uFeather"), LINE_FEATHER);
        gl.uniform3f(getUniformLocation(gl, this.program, "uLineColor"), ...LINE_COLOR);
        gl.uniform3f(getUniformLocation(gl, this.program, "uFillColor"), ...FILL_COLOR);
        gl.uniform1i(
            getUniformLocation(gl, this.program, "uMaxReflections"),
            HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS,
        );
        gl.uniform1iv(this.uniforms.textureSamplers, this.textureManager.getUnits());
        gl.uniform1i(this.uniforms.textureCount, MAX_TEXTURE_SLOTS);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    render({
        renderScene,
        viewport,
        clipToDisk,
        textures,
        canvas,
        sceneUniforms,
    }: WebGLPipelineRenderContext): void {
        if (renderScene.geometry !== GEOMETRY_KIND.hyperbolic) {
            return;
        }
        const gl = this.gl;
        const width = canvas.width || gl.drawingBufferWidth || 1;
        const height = canvas.height || gl.drawingBufferHeight || 1;
        gl.viewport(0, 0, width, height);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.resolution, width, height);
        gl.uniform3f(this.uniforms.viewport, viewport.scale, viewport.tx, viewport.ty);
        gl.uniform1i(this.uniforms.clipToDisk, clipToDisk ? 1 : 0);

        const requestedReflections = resolveMaxReflections(
            sceneUniforms as HyperbolicTripleReflectionUniforms | undefined,
            this.maxReflections,
        );
        if (requestedReflections !== this.maxReflections) {
            gl.uniform1i(this.uniforms.maxReflections, requestedReflections);
            this.maxReflections = requestedReflections;
        }

        const count = packSceneGeodesics(renderScene, this.geodesicBuffers, MAX_UNIFORM_GEODESICS);
        gl.uniform1i(this.uniforms.geodesicCount, count);
        gl.uniform4fv(this.uniforms.geodesics, this.geodesicBuffers.data);
        gl.uniform1iv(this.uniforms.geodesicKinds, this.geodesicBuffers.kinds);

        const textureUniforms = this.textureManager.sync(textures);
        gl.uniform1iv(this.uniforms.textureEnabled, textureUniforms.enabled);
        gl.uniform2fv(this.uniforms.textureOffset, textureUniforms.offset);
        gl.uniform2fv(this.uniforms.textureScale, textureUniforms.scale);
        gl.uniform1fv(this.uniforms.textureRotation, textureUniforms.rotation);
        gl.uniform1fv(this.uniforms.textureOpacity, textureUniforms.opacity);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    dispose(): void {
        const gl = this.gl;
        this.textureManager.dispose();
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteVertexArray(this.vao);
        gl.deleteProgram(this.program);
    }
}

type UniformLocations = {
    resolution: WebGLUniformLocation;
    viewport: WebGLUniformLocation;
    geodesicCount: WebGLUniformLocation;
    geodesics: WebGLUniformLocation;
    geodesicKinds: WebGLUniformLocation;
    clipToDisk: WebGLUniformLocation;
    textureEnabled: WebGLUniformLocation;
    textureOffset: WebGLUniformLocation;
    textureScale: WebGLUniformLocation;
    textureRotation: WebGLUniformLocation;
    textureOpacity: WebGLUniformLocation;
    textureCount: WebGLUniformLocation;
    textureSamplers: WebGLUniformLocation;
    maxReflections: WebGLUniformLocation;
};

function buildFragmentShaderSource(): string {
    const sampleCases = Array.from({ length: MAX_TEXTURE_SLOTS }, (_, index) => {
        return `    if (slot == ${index}) {\n        return texture(uTextures[${index}], uv);\n    }\n`;
    }).join("");

    return fragmentShaderSourceTemplate
        .replaceAll("__MAX_GEODESICS__", MAX_UNIFORM_GEODESICS.toString())
        .replaceAll("__MAX_TEXTURE_SLOTS__", MAX_TEXTURE_SLOTS.toString())
        .replace("__SAMPLE_TEXTURE_CASES__", sampleCases);
}

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
    const viewport = getUniformLocation(gl, program, "uViewport");
    const geodesicCount = getUniformLocation(gl, program, "uGeodesicCount");
    const geodesics = getUniformLocation(gl, program, "uGeodesicsA[0]");
    const geodesicKinds = getUniformLocation(gl, program, "uGeodesicKinds[0]");
    const clipToDisk = getUniformLocation(gl, program, "uClipToDisk");
    const textureEnabled = getUniformLocation(gl, program, "uTextureEnabled[0]");
    const textureOffset = getUniformLocation(gl, program, "uTextureOffset[0]");
    const textureScale = getUniformLocation(gl, program, "uTextureScale[0]");
    const textureRotation = getUniformLocation(gl, program, "uTextureRotation[0]");
    const textureOpacity = getUniformLocation(gl, program, "uTextureOpacity[0]");
    const textureCount = getUniformLocation(gl, program, "uTextureCount");
    const textureSamplers = getUniformLocation(gl, program, "uTextures[0]");
    const maxReflections = getUniformLocation(gl, program, "uMaxReflections");
    return {
        resolution,
        viewport,
        geodesicCount,
        geodesics,
        geodesicKinds,
        clipToDisk,
        textureEnabled,
        textureOffset,
        textureScale,
        textureRotation,
        textureOpacity,
        textureCount,
        textureSamplers,
        maxReflections,
    };
}

function createPipeline(
    gl: WebGL2RenderingContext,
    _canvas: HTMLCanvasElement,
): WebGLPipelineInstance {
    return new HyperbolicTripleReflectionPipeline(gl);
}

registerSceneWebGLPipeline(
    HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID,
    HYPERBOLIC_TRIPLE_REFLECTION_PIPELINE_ID,
    createPipeline,
);

function resolveMaxReflections(
    payload: HyperbolicTripleReflectionUniforms | undefined,
    fallback: number,
): number {
    const raw = payload?.uMaxReflections;
    if (raw === undefined || raw === null) {
        return clampReflections(fallback);
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return clampReflections(raw);
    }
    return clampReflections(fallback);
}

function clampReflections(value: number): number {
    const rounded = Math.round(value / REFLECTION_SLIDER_STEP) * REFLECTION_SLIDER_STEP;
    const upper = Math.max(HYPERBOLIC_TILING_333_MIN_REFLECTIONS, rounded);
    return Math.min(upper, HYPERBOLIC_TILING_333_MAX_REFLECTIONS);
}
