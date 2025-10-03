import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTextureManager } from "@/render/webgl/textureManager";
import { IDENTITY_UV_TRANSFORM, TEXTURE_SLOTS, type TextureLayer } from "@/render/webgl/textures";

function createMockGL() {
    const textureObjects: WebGLTexture[] = [];
    return {
        created: textureObjects,
        gl: {
            TEXTURE_2D: 0x0de1,
            RGBA: 0x1908,
            UNSIGNED_BYTE: 0x1401,
            TEXTURE0: 0x84c0,
            LINEAR: 0x2601,
            CLAMP_TO_EDGE: 0x812f,
            TEXTURE_MIN_FILTER: 0x2801,
            TEXTURE_MAG_FILTER: 0x2800,
            TEXTURE_WRAP_S: 0x2802,
            TEXTURE_WRAP_T: 0x2803,
            ACTIVE_TEXTURE: 0x84e0,
            UNPACK_FLIP_Y_WEBGL: 0x9240,
            createTexture: vi.fn(() => ({}) as WebGLTexture),
            deleteTexture: vi.fn((tex: WebGLTexture | null) => {
                if (tex) {
                    const idx = textureObjects.indexOf(tex);
                    if (idx >= 0) textureObjects.splice(idx, 1);
                }
            }),
            activeTexture: vi.fn(),
            bindTexture: vi.fn((target: number, texture: WebGLTexture | null) => {
                if (target !== 0x0de1) throw new Error("Unexpected target");
                if (texture && !textureObjects.includes(texture)) {
                    textureObjects.push(texture);
                }
            }),
            texParameteri: vi.fn(),
            texImage2D: vi.fn(),
            texSubImage2D: vi.fn(),
            pixelStorei: vi.fn(),
        } as unknown as WebGL2RenderingContext,
    };
}

describe("createTextureManager", () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        canvas.width = 4;
        canvas.height = 4;
    });

    it("uploads static textures once and reuses cached resources", () => {
        const { gl } = createMockGL();
        const manager = createTextureManager(gl);
        const layers: TextureLayer[] = [
            {
                slot: TEXTURE_SLOTS.base,
                kind: "image",
                enabled: true,
                opacity: 1,
                source: {
                    id: "img-1",
                    kind: "image",
                    element: canvas,
                    width: canvas.width,
                    height: canvas.height,
                },
                transform: IDENTITY_UV_TRANSFORM,
            },
        ];
        const first = manager.sync(layers);
        expect(first.enabled[0]).toBe(1);
        expect(gl.texImage2D).toHaveBeenCalledTimes(1);

        const second = manager.sync(layers);
        expect(second.enabled[0]).toBe(1);
        expect(gl.texImage2D).toHaveBeenCalledTimes(1);

        manager.dispose();
        expect(gl.deleteTexture).toHaveBeenCalled();
    });

    it("falls back to disabled when source is missing", () => {
        const { gl } = createMockGL();
        const manager = createTextureManager(gl);
        const result = manager.sync([
            {
                slot: TEXTURE_SLOTS.base,
                kind: "none",
                enabled: false,
                opacity: 0,
                source: null,
                transform: IDENTITY_UV_TRANSFORM,
            },
        ]);
        expect(result.enabled[0]).toBe(0);
        manager.dispose();
    });

    it("reuploads dynamic sources on each sync", () => {
        const { gl } = createMockGL();
        const manager = createTextureManager(gl);
        const video = document.createElement("video");
        Object.defineProperties(video, {
            videoWidth: { value: 4 },
            videoHeight: { value: 4 },
            readyState: { value: 3, configurable: true },
        });
        const layer: TextureLayer = {
            slot: TEXTURE_SLOTS.camera,
            kind: "camera",
            enabled: true,
            opacity: 1,
            source: {
                id: "cam-1",
                kind: "camera",
                element: video,
                width: 4,
                height: 4,
                dynamic: true,
            },
            transform: IDENTITY_UV_TRANSFORM,
        };
        manager.sync([layer]);
        manager.sync([layer]);
        expect(gl.texImage2D).toHaveBeenCalledTimes(2);
        manager.dispose();
    });
});
