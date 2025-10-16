import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cropToCenteredSquareMock = vi.hoisted(() => vi.fn((canvas: HTMLCanvasElement) => canvas));
const exportPNGMock = vi.hoisted(() => vi.fn(() => "data:image/png;base64,stub"));
const downloadDataUrlMock = vi.hoisted(() => vi.fn(() => true));
const captureMock = vi.hoisted(() => vi.fn());
const createRenderEngineMock = vi.hoisted(() =>
    vi.fn(() => ({
        capture: captureMock,
        dispose: vi.fn(),
        render: vi.fn(),
    })),
);
const latestControlsProps = vi.hoisted(() => ({
    current: null as null | import("@/ui/components/ImageExportControls").ImageExportControlsProps,
}));

vi.mock("@/ui/components/ImageExportControls", () => {
    type Props = import("@/ui/components/ImageExportControls").ImageExportControlsProps;
    return {
        ImageExportControls: (props: Props) => {
            latestControlsProps.current = props;
            return null;
        },
    };
});

vi.mock("@/render/crop", () => ({
    cropToCenteredSquare: cropToCenteredSquareMock,
}));

vi.mock("@/render/export", () => ({
    exportPNG: exportPNGMock,
}));

vi.mock("@/ui/utils/download", () => ({
    downloadDataUrl: downloadDataUrlMock,
}));

vi.mock("@/render/engine", async () => {
    const actual = await vi.importActual<typeof import("@/render/engine")>("@/render/engine");
    return {
        ...actual,
        createRenderEngine: createRenderEngineMock,
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
            loadFile: vi.fn(),
            loadPreset: vi.fn(),
            enableCamera: vi.fn(),
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

import { GEOMETRY_KIND } from "@/geom/core/types";
import type { UseTriangleParamsResult } from "@/ui/hooks/useTriangleParams";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import type { SceneDefinition } from "@/ui/scenes/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("EuclideanSceneHost image export", () => {
    const defaultScene: SceneDefinition = {
        id: "euclidean-default",
        key: "default",
        label: "Default",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "default",
        description: "",
        supportsHandles: false,
        editable: true,
    };

    const triangleStub: UseTriangleParamsResult = {
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

    beforeEach(() => {
        captureMock.mockReset();
        cropToCenteredSquareMock.mockReset();
        exportPNGMock.mockClear();
        downloadDataUrlMock.mockClear();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("crops captured canvas when square mode is selected", async () => {
        const compositeCanvas = { width: 600, height: 300 } as HTMLCanvasElement;
        captureMock.mockImplementation((kind: string) =>
            kind === "webgl" ? compositeCanvas : compositeCanvas,
        );

        const rootContainer = document.createElement("div");
        document.body.appendChild(rootContainer);
        const root = createRoot(rootContainer);
        act(() => {
            root.render(
                <EuclideanSceneHost
                    scene={defaultScene}
                    scenes={[defaultScene]}
                    activeSceneId={defaultScene.id}
                    onSceneChange={vi.fn()}
                    renderMode="canvas"
                    triangle={triangleStub}
                />,
            );
        });

        await act(async () => {
            await Promise.resolve();
        });

        const controls = latestControlsProps.current;
        if (!controls) {
            throw new Error("controls props not captured");
        }
        expect(controls.disabled).toBe(false);
        act(() => {
            controls.onModeChange("square-composite");
        });
        await act(async () => {
            await Promise.resolve();
        });
        const updatedControls = latestControlsProps.current;
        if (!updatedControls) {
            throw new Error("controls props not refreshed");
        }
        act(() => {
            updatedControls.onExport();
        });

        expect(createRenderEngineMock).toHaveBeenCalled();
        expect(captureMock).toHaveBeenCalled();
        expect(downloadDataUrlMock).toHaveBeenCalled();
        expect(cropToCenteredSquareMock).toHaveBeenCalledWith(compositeCanvas);
        act(() => {
            root.unmount();
        });
    });
});
