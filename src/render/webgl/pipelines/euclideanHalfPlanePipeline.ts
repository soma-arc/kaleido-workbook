import { GEOMETRY_KIND } from "@/geom/core/types";
import { buildControlPointUniforms, type ControlPoint } from "../controlPointUniforms";
import {
    createGeodesicUniformBuffers,
    MAX_UNIFORM_GEODESICS,
    packSceneGeodesics,
} from "../geodesicUniforms";
import {
    registerGeometryWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "../pipelineRegistry";
import fragmentShaderSourceTemplate from "../shaders/euclideanReflection.frag?raw";
import vertexShaderSource from "../shaders/geodesic.vert?raw";
import { createTextureManager, type TextureManager } from "../textureManager";
import { MAX_TEXTURE_SLOTS } from "../textures";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "./pipelineIds";
import { getOptionalUniformLocation, getUniformLocation } from "./uniformUtils";

/**
 * Maximum number of control points that can be rendered simultaneously.
 */
const MAX_CONTROL_POINTS = 16;

const LINE_WIDTH = 1.5;
const LINE_FEATHER = 0.9;
const LINE_COLOR = [74 / 255, 144 / 255, 226 / 255] as const;
const FILL_COLOR = [164 / 255, 208 / 255, 255 / 255] as const;
const FILL_OPACITY = 0.55;

class EuclideanHalfPlanePipeline implements WebGLPipelineInstance {
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
        const lineWidthLocation = getUniformLocation(gl, this.program, "uLineWidth");
        const featherLocation = getUniformLocation(gl, this.program, "uFeather");
        const lineColorLocation = getUniformLocation(gl, this.program, "uLineColor");
        const fillColorLocation = getUniformLocation(gl, this.program, "uFillColor");
        const fillOpacityLocation = getOptionalUniformLocation(gl, this.program, "uFillOpacity", {
            label: "EuclideanHalfPlanePipeline",
        });
        gl.uniform1f(lineWidthLocation, LINE_WIDTH);
        gl.uniform1f(featherLocation, LINE_FEATHER);
        gl.uniform3f(lineColorLocation, ...LINE_COLOR);
        gl.uniform3f(fillColorLocation, ...FILL_COLOR);
        if (fillOpacityLocation) {
            gl.uniform1f(fillOpacityLocation, FILL_OPACITY);
        }
        gl.uniform1iv(this.uniforms.textureSamplers, this.textureManager.getUnits());
        gl.uniform1i(this.uniforms.textureCount, MAX_TEXTURE_SLOTS);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    render({
        renderScene,
        viewport,
        textures,
        canvas,
        sceneDefinition,
    }: WebGLPipelineRenderContext): void {
        const gl = this.gl;
        const width = canvas.width || gl.drawingBufferWidth || 1;
        const height = canvas.height || gl.drawingBufferHeight || 1;
        gl.viewport(0, 0, width, height);
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.resolution, width, height);
        gl.uniform3f(this.uniforms.viewport, viewport.scale, viewport.tx, viewport.ty);
        const count = packSceneGeodesics(renderScene, this.geodesicBuffers, MAX_UNIFORM_GEODESICS);
        gl.uniform1i(this.uniforms.geodesicCount, count);
        gl.uniform4fv(this.uniforms.geodesics, this.geodesicBuffers.data);

        const textureUniforms = this.textureManager.sync(textures);
        gl.uniform1iv(this.uniforms.textureEnabled, textureUniforms.enabled);
        gl.uniform2fv(this.uniforms.textureOffset, textureUniforms.offset);
        gl.uniform2fv(this.uniforms.textureScale, textureUniforms.scale);
        gl.uniform1fv(this.uniforms.textureRotation, textureUniforms.rotation);
        gl.uniform1fv(this.uniforms.textureOpacity, textureUniforms.opacity);

        const rectConfig = sceneDefinition?.textureRectangle;
        const rectEnabled = rectConfig?.enabled ?? false;
        gl.uniform1i(this.uniforms.textureRectEnabled, rectEnabled ? 1 : 0);
        const center = rectConfig?.center ?? { x: 0, y: 0 };
        const halfExtents = rectConfig?.halfExtents ?? { x: 1, y: 1 };
        const rotation = rectConfig?.rotation ?? 0;
        gl.uniform2f(this.uniforms.textureRectCenter, center.x, center.y);
        gl.uniform2f(this.uniforms.textureRectHalfExtents, halfExtents.x, halfExtents.y);
        gl.uniform1f(this.uniforms.textureRectRotation, rotation);

        // Control Points
        const controlPoints: ControlPoint[] = []; // TODO: Wire to scene/UI state
        const cpUniforms = buildControlPointUniforms(controlPoints, MAX_CONTROL_POINTS);
        gl.uniform1i(this.uniforms.controlPointCount, cpUniforms.count);
        gl.uniform2fv(this.uniforms.controlPointPositions, cpUniforms.positions);
        gl.uniform1fv(this.uniforms.controlPointRadiiPx, cpUniforms.radiiPx);
        gl.uniform4fv(this.uniforms.controlPointFillColors, cpUniforms.fillColors);
        gl.uniform4fv(this.uniforms.controlPointStrokeColors, cpUniforms.strokeColors);
        gl.uniform1fv(this.uniforms.controlPointStrokeWidthsPx, cpUniforms.strokeWidthsPx);
        gl.uniform1iv(this.uniforms.controlPointShapes, cpUniforms.shapes);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
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
    textureRectEnabled: WebGLUniformLocation;
    textureRectCenter: WebGLUniformLocation;
    textureRectHalfExtents: WebGLUniformLocation;
    textureRectRotation: WebGLUniformLocation;
    // Control Points
    controlPointCount: WebGLUniformLocation;
    controlPointPositions: WebGLUniformLocation;
    controlPointRadiiPx: WebGLUniformLocation;
    controlPointFillColors: WebGLUniformLocation;
    controlPointStrokeColors: WebGLUniformLocation;
    controlPointStrokeWidthsPx: WebGLUniformLocation;
    controlPointShapes: WebGLUniformLocation;
};

function buildFragmentShaderSource(): string {
    const sampleCases = Array.from({ length: MAX_TEXTURE_SLOTS }, (_, index) => {
        return `    if (slot == ${index}) {\n        return texture(uTextures[${index}], uv);\n    }\n`;
    }).join("");

    return fragmentShaderSourceTemplate
        .replaceAll("__MAX_GEODESICS__", MAX_UNIFORM_GEODESICS.toString())
        .replaceAll("__MAX_TEXTURE_SLOTS__", MAX_TEXTURE_SLOTS.toString())
        .replaceAll("__MAX_CONTROL_POINTS__", MAX_CONTROL_POINTS.toString())
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
    const textureEnabled = getUniformLocation(gl, program, "uTextureEnabled[0]");
    const textureOffset = getUniformLocation(gl, program, "uTextureOffset[0]");
    const textureScale = getUniformLocation(gl, program, "uTextureScale[0]");
    const textureRotation = getUniformLocation(gl, program, "uTextureRotation[0]");
    const textureOpacity = getUniformLocation(gl, program, "uTextureOpacity[0]");
    const textureCount = getUniformLocation(gl, program, "uTextureCount");
    const textureSamplers = getUniformLocation(gl, program, "uTextures[0]");
    const textureRectEnabled = getUniformLocation(gl, program, "uTextureRectEnabled");
    const textureRectCenter = getUniformLocation(gl, program, "uTextureRectCenter");
    const textureRectHalfExtents = getUniformLocation(gl, program, "uTextureRectHalfExtents");
    const textureRectRotation = getUniformLocation(gl, program, "uTextureRectRotation");

    // Control Points
    const controlPointCount = getUniformLocation(gl, program, "uControlPointCount");
    const controlPointPositions = getUniformLocation(gl, program, "uControlPointPositions[0]");
    const controlPointRadiiPx = getUniformLocation(gl, program, "uControlPointRadiiPx[0]");
    const controlPointFillColors = getUniformLocation(gl, program, "uControlPointFillColors[0]");
    const controlPointStrokeColors = getUniformLocation(
        gl,
        program,
        "uControlPointStrokeColors[0]",
    );
    const controlPointStrokeWidthsPx = getUniformLocation(
        gl,
        program,
        "uControlPointStrokeWidthsPx[0]",
    );
    const controlPointShapes = getUniformLocation(gl, program, "uControlPointShapes[0]");

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
        textureRectEnabled,
        textureRectCenter,
        textureRectHalfExtents,
        textureRectRotation,
        controlPointCount,
        controlPointPositions,
        controlPointRadiiPx,
        controlPointFillColors,
        controlPointStrokeColors,
        controlPointStrokeWidthsPx,
        controlPointShapes,
    };
}

function createEuclideanHalfPlanePipeline(
    gl: WebGL2RenderingContext,
    _canvas: HTMLCanvasElement,
): WebGLPipelineInstance {
    return new EuclideanHalfPlanePipeline(gl);
}

registerGeometryWebGLPipeline(
    GEOMETRY_KIND.euclidean,
    EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    createEuclideanHalfPlanePipeline,
);
