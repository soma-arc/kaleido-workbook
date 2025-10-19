import { describe, expect, it, vi } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { unitDiskSpec } from "@/render/primitives";
import type { RenderScene } from "@/render/scene";
import { resolveWebGLPipeline } from "@/render/webgl/pipelineRegistry";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";

import "@/scenes/hyperbolic/tiling-333/pipeline";

type UniformCall = { name: string; value: number };

function createStubWebGLContext(uniformCalls: UniformCall[]): WebGL2RenderingContext {
    const uniform1i = vi.fn((location: { __name: string }, value: number) => {
        uniformCalls.push({ name: location.__name, value });
    });
    const getUniformLocation = vi.fn((_program: unknown, name: string) => ({
        __name: name,
    }));

    const gl: Partial<WebGL2RenderingContext> = {
        createVertexArray: vi.fn(() => ({})),
        createBuffer: vi.fn(() => ({})),
        bindVertexArray: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        disable: vi.fn(),
        enable: vi.fn(),
        blendFunc: vi.fn(),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        getShaderInfoLog: vi.fn(() => ""),
        deleteShader: vi.fn(),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        getProgramInfoLog: vi.fn(() => ""),
        deleteProgram: vi.fn(),
        useProgram: vi.fn(),
        getUniformLocation,
        uniform1f: vi.fn(),
        uniform3f: vi.fn(),
        uniform2f: vi.fn(),
        uniform1iv: vi.fn(),
        uniform2fv: vi.fn(),
        uniform4fv: vi.fn(),
        uniform1fv: vi.fn(),
        uniform1i,
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
        deleteBuffer: vi.fn(),
        deleteVertexArray: vi.fn(),
        createTexture: vi.fn(() => ({}) as WebGLTexture),
        deleteTexture: vi.fn(),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
        activeTexture: vi.fn(),
        pixelStorei: vi.fn(),
        texImage2D: vi.fn(),
    };

    Object.assign(gl, {
        ARRAY_BUFFER: 0x8892,
        STATIC_DRAW: 0x88e4,
        FLOAT: 0x1406,
        DEPTH_TEST: 0x0b71,
        BLEND: 0x0be2,
        SRC_ALPHA: 0x0302,
        ONE_MINUS_SRC_ALPHA: 0x0303,
        COLOR_BUFFER_BIT: 0x4000,
        TRIANGLES: 0x0004,
        TEXTURE0: 0x84c0,
        TEXTURE_2D: 0x0de1,
        LINEAR: 0x2601,
        CLAMP_TO_EDGE: 0x812f,
        UNPACK_FLIP_Y_WEBGL: 0x9240,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        COMPILE_STATUS: 0x8b81,
        LINK_STATUS: 0x8b82,
    });

    return gl as WebGL2RenderingContext;
}

describe("HyperbolicTripleReflectionPipeline", () => {
    it("updates uMaxReflections based on sceneUniforms", () => {
        const uniformCalls: UniformCall[] = [];
        const gl = createStubWebGLContext(uniformCalls);
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;

        const scene = SCENES_BY_ID[SCENE_IDS.hyperbolicTripleReflection];
        const registration = resolveWebGLPipeline(scene);
        const pipeline = registration.factory(gl, canvas);

        uniformCalls.length = 0;

        const viewport = { scale: 1, tx: 0, ty: 0 } as const;
        const renderScene: RenderScene = {
            geometry: GEOMETRY_KIND.hyperbolic,
            disk: unitDiskSpec(viewport),
            renderGeodesics: [],
            textures: [],
        };

        pipeline.render({
            sceneDefinition: scene,
            renderScene,
            viewport,
            clipToDisk: true,
            textures: [],
            canvas,
            sceneUniforms: { uMaxReflections: 22 },
        });

        const reflectionCall = uniformCalls.find((call) => call.name === "uMaxReflections");
        expect(reflectionCall?.value).toBe(22);
    });
});
