import type { SphericalTriangle } from "@/geom/spherical/types";
import { crossVec3, normalizeVec3 } from "@/geom/spherical/types";
import { packSphericalTriangleVertices } from "@/render/spherical/uniforms";
import vertexShaderSource from "../webgl/shaders/geodesic.vert?raw";
import type { SphericalOrbitCamera } from "./camera";
import fragmentShaderSource from "./shaders/spherical.frag?raw";

type ViewportSize = {
    width: number;
    height: number;
};

export type SphericalRenderSettings = {
    samples: number;
    fovY?: number;
};

export type SphericalRenderParams = {
    triangle: SphericalTriangle;
    camera: SphericalOrbitCamera;
    viewport: ViewportSize;
    settings: SphericalRenderSettings;
};

export interface SphericalRenderer {
    readonly ready: boolean;
    render(params: SphericalRenderParams): void;
    dispose(): void;
}

type UniformLocations = {
    resolution: WebGLUniformLocation;
    samples: WebGLUniformLocation;
    tanHalfFov: WebGLUniformLocation;
    cameraPosition: WebGLUniformLocation;
    cameraForward: WebGLUniformLocation;
    cameraRight: WebGLUniformLocation;
    cameraUp: WebGLUniformLocation;
    triangleVertices: WebGLUniformLocation;
    lightDirection: WebGLUniformLocation;
    triangleColor: WebGLUniformLocation;
    baseColor: WebGLUniformLocation;
    backgroundColor: WebGLUniformLocation;
};

const DEFAULT_FOVY = Math.PI / 4;
const MAX_SAMPLES = 8;

export function createSphericalRenderer(canvas: HTMLCanvasElement): SphericalRenderer {
    const gl = canvas.getContext("webgl2", {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
    }) as WebGL2RenderingContext | null;

    if (!gl) {
        return createStubRenderer(canvas);
    }

    try {
        return createRealRenderer(gl, canvas);
    } catch (error) {
        console.error("[spherical] Failed to initialise renderer", error);
        return createStubRenderer(canvas);
    }
}

export function createSphericalRendererWithContext(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
): SphericalRenderer {
    try {
        return createRealRenderer(gl, canvas);
    } catch (error) {
        console.error("[spherical] Failed to initialise renderer", error);
        return createStubRenderer(canvas);
    }
}

function createStubRenderer(canvas: HTMLCanvasElement): SphericalRenderer {
    return {
        ready: false,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        render: (_params: SphericalRenderParams) => {
            // no-op
        },
        dispose: () => {
            canvas.width = 0;
            canvas.height = 0;
        },
    };
}

function createRealRenderer(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
): SphericalRenderer {
    const program = buildProgram(gl);
    const vao = createFullscreenTriangle(gl);
    const uniforms = resolveUniformLocations(gl, program);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);

    const defaultLight = normalizeVec3({ x: 0.3, y: 0.6, z: 0.75 });
    const triangleColor = new Float32Array([0.94, 0.52, 0.36]);
    const baseColor = new Float32Array([0.18, 0.23, 0.42]);
    const backgroundColor = new Float32Array([0.02, 0.03, 0.06]);

    return {
        ready: true,
        render: ({ triangle, camera, viewport, settings }) => {
            const width = Math.max(1, viewport.width | 0);
            const height = Math.max(1, viewport.height | 0);
            const samples = clampSamples(settings.samples ?? 1);
            const fovY = settings.fovY ?? DEFAULT_FOVY;
            const tanHalfFov = Math.tan(fovY / 2);

            gl.viewport(0, 0, width, height);
            gl.useProgram(program);
            gl.uniform2f(uniforms.resolution, width, height);
            gl.uniform1i(uniforms.samples, samples);
            gl.uniform1f(uniforms.tanHalfFov, tanHalfFov);

            const eye = camera.getEyePosition();
            const forward = normalizeVec3({ x: -eye.x, y: -eye.y, z: -eye.z });
            const worldUp = { x: 0, y: 1, z: 0 } as const;
            let right = crossVec3(forward, worldUp);
            const rightLength = Math.hypot(right.x, right.y, right.z);
            if (rightLength < 1e-6) {
                right = normalizeVec3({ x: 0, y: 0, z: 1 });
            } else {
                right = normalizeVec3(right);
            }
            const up = crossVec3(right, forward);

            gl.uniform3f(uniforms.cameraPosition, eye.x, eye.y, eye.z);
            gl.uniform3f(uniforms.cameraForward, forward.x, forward.y, forward.z);
            gl.uniform3f(uniforms.cameraRight, right.x, right.y, right.z);
            gl.uniform3f(uniforms.cameraUp, up.x, up.y, up.z);

            const packedVertices = packSphericalTriangleVertices(triangle);
            gl.uniform3fv(uniforms.triangleVertices, packedVertices);
            gl.uniform3f(uniforms.lightDirection, defaultLight.x, defaultLight.y, defaultLight.z);
            gl.uniform3fv(uniforms.triangleColor, triangleColor);
            gl.uniform3fv(uniforms.baseColor, baseColor);
            gl.uniform3fv(uniforms.backgroundColor, backgroundColor);

            gl.bindVertexArray(vao);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.bindVertexArray(null);
            gl.useProgram(null);
        },
        dispose: () => {
            gl.deleteVertexArray(vao);
            gl.deleteProgram(program);
            canvas.width = 0;
            canvas.height = 0;
        },
    };
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Failed to create spherical shader program");
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) ?? "Unknown link error";
        throw new Error(`Spherical shader link failed: ${info}`);
    }
    return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error("Failed to create shader");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) ?? "Unknown compile error";
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info}`);
    }
    return shader;
}

function createFullscreenTriangle(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vao = gl.createVertexArray();
    if (!vao) {
        throw new Error("Failed to create VAO");
    }
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        throw new Error("Failed to create vertex buffer");
    }
    const vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(vertexBuffer);
    return vao;
}

function resolveUniformLocations(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
): UniformLocations {
    return {
        resolution: getUniformLocation(gl, program, "uResolution"),
        samples: getUniformLocation(gl, program, "uSampleCount"),
        tanHalfFov: getUniformLocation(gl, program, "uTanHalfFov"),
        cameraPosition: getUniformLocation(gl, program, "uCameraPosition"),
        cameraForward: getUniformLocation(gl, program, "uCameraForward"),
        cameraRight: getUniformLocation(gl, program, "uCameraRight"),
        cameraUp: getUniformLocation(gl, program, "uCameraUp"),
        triangleVertices: getUniformLocation(gl, program, "uTriangleVertices[0]"),
        lightDirection: getUniformLocation(gl, program, "uLightDirection"),
        triangleColor: getUniformLocation(gl, program, "uTriangleColor"),
        baseColor: getUniformLocation(gl, program, "uSphereBaseColor"),
        backgroundColor: getUniformLocation(gl, program, "uBackgroundColor"),
    };
}

function getUniformLocation(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error(`Uniform ${name} not found in spherical shader`);
    }
    return location;
}

function clampSamples(samples: number): number {
    const value = Number.isFinite(samples) ? Math.round(samples) : 1;
    return Math.min(Math.max(value, 1), MAX_SAMPLES);
}
