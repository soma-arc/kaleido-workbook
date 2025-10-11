import { GEOMETRY_KIND } from "@/geom/core/types";
import { SCENE_IDS } from "@/ui/scenes";
import type { CircleInversionState } from "@/ui/scenes/circleInversionConfig";
import {
    registerSceneWebGLPipeline,
    type WebGLPipelineInstance,
    type WebGLPipelineRenderContext,
} from "../pipelineRegistry";
import fragmentShaderSource from "../shaders/euclideanCircleInversion.frag?raw";
import vertexShaderSource from "../shaders/geodesic.vert?raw";

export const EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID = "webgl-euclidean-circle-inversion" as const;

const RECT_COLOR = [0.231, 0.514, 0.918, 0.75] as const;
const INVERTED_COLOR = [0.976, 0.545, 0.259, 0.72] as const;
const CIRCLE_COLOR = [0.95, 0.98, 1.0, 0.9] as const;

const RECT_FEATHER_PX = 1.5;
const CIRCLE_STROKE_WIDTH_PX = 2.0;
const CIRCLE_FEATHER_PX = 1.2;

class EuclideanCircleInversionPipeline implements WebGLPipelineInstance {
    private readonly gl: WebGL2RenderingContext;
    private readonly program: WebGLProgram;
    private readonly vao: WebGLVertexArrayObject;
    private readonly vertexBuffer: WebGLBuffer;
    private readonly uniforms: UniformLocations;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
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

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.uniforms = resolveUniformLocations(gl, this.program);

        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform4f(this.uniforms.rectColor, ...RECT_COLOR);
        gl.uniform4f(this.uniforms.invertedColor, ...INVERTED_COLOR);
        gl.uniform4f(this.uniforms.circleColor, ...CIRCLE_COLOR);
        gl.uniform1f(this.uniforms.rectFeatherPx, RECT_FEATHER_PX);
        gl.uniform1f(this.uniforms.circleStrokeWidthPx, CIRCLE_STROKE_WIDTH_PX);
        gl.uniform1f(this.uniforms.circleFeatherPx, CIRCLE_FEATHER_PX);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(null);
    }

    render({ sceneDefinition, renderScene, viewport, canvas }: WebGLPipelineRenderContext): void {
        if (renderScene.geometry !== GEOMETRY_KIND.euclidean) {
            return;
        }
        const gl = this.gl;
        const width = canvas.width || gl.drawingBufferWidth || 1;
        const height = canvas.height || gl.drawingBufferHeight || 1;

        const resolvedState = resolveInversionState(sceneDefinition?.inversionConfig, renderScene);
        if (!resolvedState) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }

        gl.viewport(0, 0, width, height);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation outside React components.
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.resolution, width, height);
        gl.uniform3f(this.uniforms.viewport, viewport.scale, viewport.tx, viewport.ty);
        gl.uniform2f(
            this.uniforms.circleCenter,
            resolvedState.fixedCircle.center.x,
            resolvedState.fixedCircle.center.y,
        );
        gl.uniform1f(this.uniforms.circleRadius, resolvedState.fixedCircle.radius);
        gl.uniform2f(
            this.uniforms.rectCenter,
            resolvedState.rectangle.center.x,
            resolvedState.rectangle.center.y,
        );
        gl.uniform2f(
            this.uniforms.rectHalfExtents,
            resolvedState.rectangle.halfExtents.x,
            resolvedState.rectangle.halfExtents.y,
        );
        gl.uniform1f(this.uniforms.rectRotation, resolvedState.rectangle.rotation);

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
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteVertexArray(this.vao);
        gl.deleteProgram(this.program);
    }
}

type UniformLocations = {
    resolution: WebGLUniformLocation;
    viewport: WebGLUniformLocation;
    circleCenter: WebGLUniformLocation;
    circleRadius: WebGLUniformLocation;
    rectCenter: WebGLUniformLocation;
    rectHalfExtents: WebGLUniformLocation;
    rectRotation: WebGLUniformLocation;
    rectColor: WebGLUniformLocation;
    invertedColor: WebGLUniformLocation;
    circleColor: WebGLUniformLocation;
    rectFeatherPx: WebGLUniformLocation;
    circleStrokeWidthPx: WebGLUniformLocation;
    circleFeatherPx: WebGLUniformLocation;
};

function resolveInversionState(
    config: CircleInversionState | undefined,
    scene: WebGLPipelineRenderContext["renderScene"],
): CircleInversionState | null {
    if (scene.geometry !== GEOMETRY_KIND.euclidean) {
        return null;
    }
    const runtimeState = scene.inversion;
    if (runtimeState) {
        return {
            fixedCircle: {
                center: { ...runtimeState.fixedCircle.center },
                radius: runtimeState.fixedCircle.radius,
            },
            rectangle: {
                center: { ...runtimeState.rectangle.center },
                halfExtents: { ...runtimeState.rectangle.halfExtents },
                rotation: runtimeState.rectangle.rotation,
            },
        };
    }
    if (config) {
        return {
            fixedCircle: {
                center: { ...config.fixedCircle.center },
                radius: config.fixedCircle.radius,
            },
            rectangle: {
                center: { ...config.rectangle.center },
                halfExtents: { ...config.rectangle.halfExtents },
                rotation: config.rectangle.rotation,
            },
        };
    }
    return null;
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

function getUniformLocation(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error(`Uniform not found: ${name}`);
    }
    return location;
}

function resolveUniformLocations(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
): UniformLocations {
    return {
        resolution: getUniformLocation(gl, program, "uResolution"),
        viewport: getUniformLocation(gl, program, "uViewport"),
        circleCenter: getUniformLocation(gl, program, "uCircleCenter"),
        circleRadius: getUniformLocation(gl, program, "uCircleRadius"),
        rectCenter: getUniformLocation(gl, program, "uRectCenter"),
        rectHalfExtents: getUniformLocation(gl, program, "uRectHalfExtents"),
        rectRotation: getUniformLocation(gl, program, "uRectRotation"),
        rectColor: getUniformLocation(gl, program, "uRectColor"),
        invertedColor: getUniformLocation(gl, program, "uInvertedColor"),
        circleColor: getUniformLocation(gl, program, "uCircleColor"),
        rectFeatherPx: getUniformLocation(gl, program, "uRectFeatherPx"),
        circleStrokeWidthPx: getUniformLocation(gl, program, "uCircleStrokeWidthPx"),
        circleFeatherPx: getUniformLocation(gl, program, "uCircleFeatherPx"),
    };
}

registerSceneWebGLPipeline(
    SCENE_IDS.euclideanCircleInversion,
    EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID,
    (gl) => new EuclideanCircleInversionPipeline(gl),
);
