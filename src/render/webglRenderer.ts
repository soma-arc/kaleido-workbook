import type { TileScene } from "./scene";
import type { Viewport } from "./viewport";
import {
    createGeodesicUniformBuffers,
    MAX_UNIFORM_GEODESICS,
    packSceneGeodesics,
} from "./webgl/geodesicUniforms";
import fragmentShaderSourceTemplate from "./webgl/shaders/geodesic.frag?raw";
import vertexShaderSource from "./webgl/shaders/geodesic.vert?raw";

const LINE_WIDTH = 1.5;
const LINE_FEATHER = 0.9;
const LINE_COLOR = [74 / 255, 144 / 255, 226 / 255] as const;

export interface WebGLRenderer {
    render(scene: TileScene, viewport: Viewport): void;
    dispose(): void;
}

export type WebGLInitResult = {
    renderer: WebGLRenderer;
    canvas: HTMLCanvasElement | null;
    ready: boolean;
};

export function createWebGLRenderer(): WebGLInitResult {
    const glCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!glCanvas) {
        console.error("[render] WebGL2 is unavailable in this environment");
        return createStubRenderer(null);
    }

    const gl = glCanvas.getContext("webgl2", {
        preserveDrawingBuffer: true,
        antialias: true,
    }) as WebGL2RenderingContext | null;

    if (!gl) {
        console.error("[render] WebGL2 context acquisition failed");
        return createStubRenderer(glCanvas);
    }

    try {
        return createRealRenderer(glCanvas, gl);
    } catch (error) {
        console.error("[render] WebGL renderer initialisation failed", error);
        return createStubRenderer(glCanvas);
    }
}

function createStubRenderer(canvas: HTMLCanvasElement | null): WebGLInitResult {
    return {
        canvas,
        ready: false,
        renderer: {
            render: (_scene: TileScene, _viewport: Viewport) => {
                /* no-op */
            },
            dispose: () => {
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                }
            },
        },
    };
}

function createRealRenderer(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
): WebGLInitResult {
    const fragmentShaderSource = buildFragmentShaderSource();
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = linkProgram(gl, vertexShader, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create VAO");
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) throw new Error("Failed to create vertex buffer");

    const fullscreenTriangle = new Float32Array([-1, -1, 3, -1, -1, 3]);

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, fullscreenTriangle, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation not related to React hooks.
    gl.useProgram(program);
    gl.uniform3f(gl.getUniformLocation(program, "uLineColor"), ...LINE_COLOR);
    gl.uniform1f(gl.getUniformLocation(program, "uLineWidth"), LINE_WIDTH);
    gl.uniform1f(gl.getUniformLocation(program, "uFeather"), LINE_FEATHER);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API invocation not related to React hooks.
    gl.useProgram(null);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const geodesicBuffers = createGeodesicUniformBuffers(MAX_UNIFORM_GEODESICS);
    const uniforms = resolveUniformLocations(gl, program);

    return {
        canvas,
        ready: true,
        renderer: {
            render: (scene: TileScene, viewport: Viewport) => {
                const width = canvas.width || gl.drawingBufferWidth || 1;
                const height = canvas.height || gl.drawingBufferHeight || 1;
                gl.viewport(0, 0, width, height);
                gl.useProgram(program);
                gl.uniform3f(uniforms.viewport, viewport.scale, viewport.tx, viewport.ty);
                const count = packSceneGeodesics(scene, geodesicBuffers, MAX_UNIFORM_GEODESICS);
                gl.uniform1i(uniforms.geodesicCount, count);
                gl.uniform4fv(uniforms.geodesics, geodesicBuffers.data);

                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.bindVertexArray(vao);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                gl.bindVertexArray(null);
                gl.useProgram(null);
            },
            dispose: () => {
                gl.deleteBuffer(vertexBuffer);
                gl.deleteVertexArray(vao);
                gl.deleteProgram(program);
                canvas.width = 0;
                canvas.height = 0;
            },
        },
    };
}

function buildFragmentShaderSource(): string {
    return fragmentShaderSourceTemplate.replace(
        "__MAX_GEODESICS__",
        MAX_UNIFORM_GEODESICS.toString(),
    );
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

type UniformLocations = {
    viewport: WebGLUniformLocation;
    geodesicCount: WebGLUniformLocation;
    geodesics: WebGLUniformLocation;
};

function resolveUniformLocations(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
): UniformLocations {
    const viewport = getUniformLocation(gl, program, "uViewport");
    const geodesicCount = getUniformLocation(gl, program, "uGeodesicCount");
    const geodesics = getUniformLocation(gl, program, "uGeodesicsA[0]");
    return { viewport, geodesicCount, geodesics };
}

function getUniformLocation(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error(`Uniform ${name} not found`);
    }
    return location;
}
