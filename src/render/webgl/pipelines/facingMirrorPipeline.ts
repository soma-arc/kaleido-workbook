import { GEOMETRY_KIND } from "@/geom/core/types";
import { SCENE_IDS } from "@/ui/scenes";
import type { FacingMirrorSceneConfig, SceneDefinition } from "@/ui/scenes/types";
import {
    createGeodesicUniformBuffers,
    MAX_UNIFORM_GEODESICS,
    packSceneGeodesics,
} from "../geodesicUniforms";
import {
    registerSceneWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "../pipelineRegistry";
import fragmentShaderSourceTemplate from "../shaders/facingMirror.frag?raw";
import vertexShaderSource from "../shaders/geodesic.vert?raw";
import { createTextureManager, type TextureManager } from "../textureManager";
import { MAX_TEXTURE_SLOTS } from "../textures";
import { getUniformLocation } from "./uniformUtils";

export const FACING_MIRROR_PIPELINE_ID = "webgl-facing-mirror" as const;

const MIRROR_LINE_WIDTH_PX = 2.2;
const MIRROR_FEATHER_PX = 1.4;
const MIRROR_LINE_COLOR = [0.78, 0.86, 0.96] as const;
const MIRROR_FILL_COLOR = [0.26, 0.38, 0.54] as const;
const BACKGROUND_COLOR = [0.04, 0.08, 0.12] as const;
const RECT_FEATHER_PX = 2.8;

const DEFAULT_RECT_CONFIG: FacingMirrorSceneConfig = {
    rectangleCenter: { x: 0, y: 0 },
    rectangleHalfExtents: { x: 0.25, y: 0.25 },
    fallbackColor: { r: 0.86, g: 0.89, b: 0.96, a: 0.95 },
};

class FacingMirrorPipeline implements WebGLPipelineInstance {
    private readonly gl: WebGL2RenderingContext;
    private readonly program: WebGLProgram;
    private readonly vao: WebGLVertexArrayObject;
    private readonly vertexBuffer: WebGLBuffer;
    private readonly textureManager: TextureManager;
    private readonly geodesicBuffers = createGeodesicUniformBuffers(MAX_UNIFORM_GEODESICS);
    private readonly uniforms: UniformLocations;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentShaderSource());
        this.program = linkProgram(gl, vertexShader, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        const vao = gl.createVertexArray();
        if (!vao) throw new Error("FacingMirrorPipeline: failed to create VAO");
        this.vao = vao;
        const vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) throw new Error("FacingMirrorPipeline: failed to create vertex buffer");
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
        gl.uniform1f(this.uniforms.mirrorLineWidthPx, MIRROR_LINE_WIDTH_PX);
        gl.uniform1f(this.uniforms.mirrorFeatherPx, MIRROR_FEATHER_PX);
        gl.uniform3f(this.uniforms.mirrorLineColor, ...MIRROR_LINE_COLOR);
        gl.uniform3f(this.uniforms.mirrorFillColor, ...MIRROR_FILL_COLOR);
        gl.uniform3f(this.uniforms.backgroundColor, ...BACKGROUND_COLOR);
        gl.uniform1f(this.uniforms.rectangleFeatherPx, RECT_FEATHER_PX);
        gl.uniform1iv(this.uniforms.textureSamplers, this.textureManager.getUnits());
        gl.uniform1i(this.uniforms.textureCount, MAX_TEXTURE_SLOTS);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    render({
        sceneDefinition,
        renderScene,
        viewport,
        textures,
        canvas,
    }: WebGLPipelineRenderContext): void {
        if (renderScene.geometry !== GEOMETRY_KIND.euclidean) {
            return;
        }
        const gl = this.gl;
        const width = canvas.width || gl.drawingBufferWidth || 1;
        const height = canvas.height || gl.drawingBufferHeight || 1;
        gl.viewport(0, 0, width, height);

        const config = resolveFacingMirrorConfig(sceneDefinition);

        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.resolution, width, height);
        gl.uniform3f(this.uniforms.viewport, viewport.scale, viewport.tx, viewport.ty);
        gl.uniform2f(
            this.uniforms.rectangleCenter,
            config.rectangleCenter.x,
            config.rectangleCenter.y,
        );
        gl.uniform2f(
            this.uniforms.rectangleHalfExtents,
            config.rectangleHalfExtents.x,
            config.rectangleHalfExtents.y,
        );
        gl.uniform4f(
            this.uniforms.rectangleFallbackColor,
            config.fallbackColor.r,
            config.fallbackColor.g,
            config.fallbackColor.b,
            config.fallbackColor.a,
        );

        const count = packSceneGeodesics(renderScene, this.geodesicBuffers, MAX_UNIFORM_GEODESICS);
        gl.uniform1i(this.uniforms.geodesicCount, count);
        gl.uniform4fv(this.uniforms.geodesics, this.geodesicBuffers.data);

        const textureUniforms = this.textureManager.sync(textures ?? []);
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
    textureEnabled: WebGLUniformLocation;
    textureOffset: WebGLUniformLocation;
    textureScale: WebGLUniformLocation;
    textureRotation: WebGLUniformLocation;
    textureOpacity: WebGLUniformLocation;
    textureCount: WebGLUniformLocation;
    textureSamplers: WebGLUniformLocation;
    mirrorLineWidthPx: WebGLUniformLocation;
    mirrorFeatherPx: WebGLUniformLocation;
    mirrorLineColor: WebGLUniformLocation;
    mirrorFillColor: WebGLUniformLocation;
    backgroundColor: WebGLUniformLocation;
    rectangleCenter: WebGLUniformLocation;
    rectangleHalfExtents: WebGLUniformLocation;
    rectangleFallbackColor: WebGLUniformLocation;
    rectangleFeatherPx: WebGLUniformLocation;
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
    if (!shader) throw new Error("FacingMirrorPipeline: failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) ?? "Unknown error";
        gl.deleteShader(shader);
        throw new Error(`FacingMirrorPipeline: shader compilation failed: ${info}`);
    }
    return shader;
}

function linkProgram(
    gl: WebGL2RenderingContext,
    vertex: WebGLShader,
    fragment: WebGLShader,
): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error("FacingMirrorPipeline: failed to create program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) ?? "Unknown error";
        gl.deleteProgram(program);
        throw new Error(`FacingMirrorPipeline: link failed: ${info}`);
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
    const textureEnabled = getUniformLocation(gl, program, "uTextureEnabled[0]");
    const textureOffset = getUniformLocation(gl, program, "uTextureOffset[0]");
    const textureScale = getUniformLocation(gl, program, "uTextureScale[0]");
    const textureRotation = getUniformLocation(gl, program, "uTextureRotation[0]");
    const textureOpacity = getUniformLocation(gl, program, "uTextureOpacity[0]");
    const textureCount = getUniformLocation(gl, program, "uTextureCount");
    const textureSamplers = getUniformLocation(gl, program, "uTextures[0]");
    const mirrorLineWidthPx = getUniformLocation(gl, program, "uMirrorLineWidthPx");
    const mirrorFeatherPx = getUniformLocation(gl, program, "uMirrorFeatherPx");
    const mirrorLineColor = getUniformLocation(gl, program, "uMirrorLineColor");
    const mirrorFillColor = getUniformLocation(gl, program, "uMirrorFillColor");
    const backgroundColor = getUniformLocation(gl, program, "uBackgroundColor");
    const rectangleCenter = getUniformLocation(gl, program, "uRectangleCenter");
    const rectangleHalfExtents = getUniformLocation(gl, program, "uRectangleHalfExtents");
    const rectangleFallbackColor = getUniformLocation(gl, program, "uRectangleFallbackColor");
    const rectangleFeatherPx = getUniformLocation(gl, program, "uRectangleFeatherPx");
    return {
        resolution,
        viewport,
        geodesicCount,
        geodesics,
        textureEnabled,
        textureOffset,
        textureScale,
        textureRotation,
        textureOpacity,
        textureCount,
        textureSamplers,
        mirrorLineWidthPx,
        mirrorFeatherPx,
        mirrorLineColor,
        mirrorFillColor,
        backgroundColor,
        rectangleCenter,
        rectangleHalfExtents,
        rectangleFallbackColor,
        rectangleFeatherPx,
    };
}

function resolveFacingMirrorConfig(scene?: SceneDefinition): FacingMirrorSceneConfig {
    if (scene?.facingMirrorConfig) {
        return {
            rectangleCenter: { ...scene.facingMirrorConfig.rectangleCenter },
            rectangleHalfExtents: { ...scene.facingMirrorConfig.rectangleHalfExtents },
            fallbackColor: { ...scene.facingMirrorConfig.fallbackColor },
        };
    }
    return {
        rectangleCenter: { ...DEFAULT_RECT_CONFIG.rectangleCenter },
        rectangleHalfExtents: { ...DEFAULT_RECT_CONFIG.rectangleHalfExtents },
        fallbackColor: { ...DEFAULT_RECT_CONFIG.fallbackColor },
    };
}

registerSceneWebGLPipeline(SCENE_IDS.facingMirrorRoom, FACING_MIRROR_PIPELINE_ID, (gl) => {
    return new FacingMirrorPipeline(gl);
});
