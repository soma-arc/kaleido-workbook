import { describe, expect, it, vi } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";

const rendererRenderSpy = vi.fn();
const rendererDisposeSpy = vi.fn();

vi.mock("@/render/webglRenderer", () => {
    return {
        createWebGLRenderer: vi.fn(() => ({
            renderer: {
                render: rendererRenderSpy,
                dispose: rendererDisposeSpy,
            },
            canvas: document.createElement("canvas"),
            ready: true,
        })),
    };
});

const { buildHyperbolicSceneMock, buildEuclideanSceneMock } = vi.hoisted(() => ({
    buildHyperbolicSceneMock: vi.fn(() => ({
        geometry: GEOMETRY_KIND.hyperbolic,
        renderGeodesics: [],
    })),
    buildEuclideanSceneMock: vi.fn(() => ({
        geometry: GEOMETRY_KIND.euclidean,
        halfPlanes: [],
    })),
}));

vi.mock("@/render/scene", () => ({
    buildHyperbolicScene: buildHyperbolicSceneMock,
    buildEuclideanScene: buildEuclideanSceneMock,
}));

vi.mock("@/render/canvasLayers", () => ({
    renderTileLayer: vi.fn(),
    renderHandleOverlay: vi.fn(),
}));

import { createRenderEngine } from "@/render/engine";

describe("createRenderEngine", () => {
    it("passes sceneUniforms through to the WebGL renderer", () => {
        const canvas = document.createElement("canvas");
        Object.defineProperty(canvas, "getContext", {
            value: vi.fn(() => ({
                canvas,
                clearRect: vi.fn(),
                drawImage: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                closePath: vi.fn(),
                setLineDash: vi.fn(),
            })),
        });
        Object.defineProperty(canvas, "getBoundingClientRect", {
            value: () => ({
                width: 640,
                height: 480,
                top: 0,
                left: 0,
                bottom: 480,
                right: 640,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }),
        });

        const engine = createRenderEngine(canvas);
        const uniforms = { uMaxReflections: 24 } as const;

        rendererRenderSpy.mockClear();

        const scene = SCENES_BY_ID[SCENE_IDS.hyperbolicTripleReflection];

        engine.render({
            geometry: GEOMETRY_KIND.hyperbolic,
            params: { p: 3, q: 3, r: 3, depth: 0 },
            scene,
            textures: [],
            sceneUniforms: uniforms,
        });

        expect(rendererRenderSpy).toHaveBeenCalledTimes(1);
        const [, , options] = rendererRenderSpy.mock.calls[0];
        expect(options?.sceneUniforms).toStrictEqual(uniforms);
    });
});
