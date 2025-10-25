import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Viewport } from "@/render/viewport";

const panByMock = vi.hoisted(() => vi.fn());
const zoomAtMock = vi.hoisted(() => vi.fn());
const resetMock = vi.hoisted(() => vi.fn());
const getViewportMock = vi.hoisted(() =>
    vi.fn((canvas: HTMLCanvasElement, compute: (canvas: HTMLCanvasElement) => Viewport) =>
        compute(canvas),
    ),
);
const modifierRef = vi.hoisted(() => ({
    current: { scale: 1, offsetX: 0, offsetY: 0 },
}));

vi.mock("@/ui/hooks/useRenderEngine", () => {
    const canvasRef: { current: HTMLCanvasElement | null } = { current: null };
    const render = vi.fn();
    const engine = {
        render,
        dispose: vi.fn(),
        capture: vi.fn(),
        getMode: () => "canvas" as const,
    };
    return {
        useRenderEngineWithCanvas: () => ({
            canvasRef,
            renderEngineRef: { current: engine },
            renderMode: "canvas" as const,
            ready: true,
        }),
    };
});

vi.mock("@/ui/hooks/useTextureSource", async () => {
    const actualTextures =
        await vi.importActual<typeof import("@/render/webgl/textures")>("@/render/webgl/textures");
    const slots: Record<string, { layer: null; status: "idle"; error: null }> = {};
    for (const slot of Object.values(actualTextures.TEXTURE_SLOTS)) {
        slots[slot] = { layer: null, status: "idle", error: null } as const;
    }
    return {
        useTextureInput: () => ({
            textures: [],
            sceneTextures: [],
            slots,
            loadFile: vi.fn(() => Promise.resolve()),
            loadPreset: vi.fn(() => Promise.resolve()),
            enableCamera: vi.fn(() => Promise.resolve()),
            enableCanvas: vi.fn(() => ({
                canvas: document.createElement("canvas"),
                context: null,
                resize: vi.fn(),
            })),
            disable: vi.fn(),
            setTransform: vi.fn(),
            presets: [],
        }),
    };
});

vi.mock("@/ui/hooks/usePanZoomState", () => ({
    usePanZoomState: (computeBaseViewport: (canvas: HTMLCanvasElement) => Viewport) => ({
        modifier: modifierRef.current,
        modifierRef,
        getViewport: (canvas: HTMLCanvasElement) => {
            return getViewportMock(canvas, computeBaseViewport);
        },
        panBy: panByMock,
        zoomAt: zoomAtMock,
        reset: resetMock,
    }),
}));

import { GEOMETRY_KIND } from "@/geom/core/types";
import { euclideanHingeScene } from "@/scenes/euclidean/hinge/definition";
import type { UseTriangleParamsResult } from "@/ui/hooks/useTriangleParams";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import type { SceneDefinition } from "@/ui/scenes/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type PointerEventOverrides = {
    pointerId?: number;
    clientX?: number;
    clientY?: number;
    buttons?: number;
};

function dispatchPointerEvent(
    target: HTMLElement,
    type: string,
    overrides: PointerEventOverrides = {},
): void {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
        pointerId: overrides.pointerId ?? 1,
        clientX: overrides.clientX ?? 0,
        clientY: overrides.clientY ?? 0,
        buttons: overrides.buttons ?? 1,
    });
    target.dispatchEvent(event);
}

function createTriangleStub(): UseTriangleParamsResult {
    return {
        params: { p: 3, q: 3, r: 3, depth: 1 },
        formInputs: { p: "3", q: "3", r: "3" },
        anchor: null,
        snapEnabled: false,
        paramError: null,
        paramWarning: null,
        rRange: { min: 2, max: 6 },
        rSliderValue: 3,
        rStep: 1,
        depthRange: { min: 0, max: 5 },
        geometryMode: GEOMETRY_KIND.euclidean,
        setParamInput: vi.fn(),
        setFromPreset: vi.fn(),
        clearAnchor: vi.fn(),
        setSnapEnabled: vi.fn(),
        setRFromSlider: vi.fn(),
        updateDepth: vi.fn(),
        setGeometryMode: vi.fn(),
    };
}

describe("EuclideanSceneHost pan", () => {
    let container: HTMLDivElement;
    let cleanup: () => void;

    beforeEach(() => {
        modifierRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
        panByMock.mockReset();
        zoomAtMock.mockReset();
        resetMock.mockReset();
        getViewportMock.mockImplementation(
            (canvas: HTMLCanvasElement, compute: (canvas: HTMLCanvasElement) => Viewport) =>
                compute(canvas),
        );

        container = document.createElement("div");
        document.body.appendChild(container);

        const root = createRoot(container);
        cleanup = () => {
            act(() => {
                root.unmount();
            });
            container.remove();
        };

        const hingeScene: SceneDefinition = {
            ...euclideanHingeScene,
            id: `euclidean-${euclideanHingeScene.variant}`,
        };

        act(() => {
            root.render(
                <EuclideanSceneHost
                    scene={hingeScene}
                    scenes={[hingeScene]}
                    activeSceneId={hingeScene.id}
                    onSceneChange={vi.fn()}
                    renderMode="canvas"
                    triangle={createTriangleStub()}
                />,
            );
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("updates pan offsets in the same vertical direction as the drag", () => {
        const canvas = container.querySelector<HTMLCanvasElement>("canvas");
        if (!canvas) {
            throw new Error("canvas not found");
        }
        Object.defineProperty(canvas, "setPointerCapture", { value: vi.fn(), writable: true });
        Object.defineProperty(canvas, "releasePointerCapture", { value: vi.fn(), writable: true });
        Object.defineProperty(canvas, "getBoundingClientRect", {
            value: () => ({
                left: 0,
                top: 0,
                width: 960,
                height: 540,
                right: 960,
                bottom: 540,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }),
        });

        act(() => {
            dispatchPointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 200 });
        });

        act(() => {
            dispatchPointerEvent(canvas, "pointermove", { clientX: 200, clientY: 240 });
        });

        expect(panByMock).toHaveBeenCalledWith(0, -40);
    });
});
