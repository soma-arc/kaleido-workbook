import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor } from "@storybook/test";
import { useMemo } from "react";
import { halfPlaneFromNormalAndOffset } from "@/geom/primitives/halfPlane";
import { getCanvasPixelRatio } from "@/render/canvas";
import { detectRenderMode } from "@/render/engine";
import { worldToScreen } from "@/render/viewport";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { SCENE_IDS } from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";
import { expectCanvasFill } from "./canvasAssertions";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

/** Story arguments controlling the single half-plane showcase. */
type SingleHalfPlaneStoryArgs = {
    /** Half-plane offset applied in the signed distance equation. */
    offset: number;
    /** Angle of the half-plane normal in degrees, measured counter-clockwise from +X. */
    normalAngle: number;
    /** Desired handle spacing used when generating control points. */
    handleSpacing: number;
};

function normalizeAngle(angleInDegrees: number): number {
    const wrapped = angleInDegrees % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
}

function toUnitNormal(angleInDegrees: number) {
    const angle = (normalizeAngle(angleInDegrees) * Math.PI) / 180;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
}

function clampSpacing(value: number): number {
    const min = 0.2;
    const max = 1.5;
    if (!Number.isFinite(value)) return 0.6;
    return Math.min(Math.max(value, min), max);
}

/**
 * Story component rendering the single half-plane scene with adjustable parameters.
 */
function SingleHalfPlaneSceneDemo({
    offset,
    normalAngle,
    handleSpacing,
}: SingleHalfPlaneStoryArgs): JSX.Element {
    const { scenes } = useSceneRegistry();
    const baseScene = useMemo(() => {
        const match = scenes.find((item) => item.id === SCENE_IDS.euclideanSingleHalfPlane);
        if (!match) {
            throw new Error("Single half-plane scene definition not registered");
        }
        return match;
    }, [scenes]);

    const configuredScene = useMemo(() => {
        const unitNormal = toUnitNormal(normalAngle);
        return {
            ...baseScene,
            initialHalfPlanes: [halfPlaneFromNormalAndOffset(unitNormal, offset)],
            defaultHandleSpacing: clampSpacing(handleSpacing),
        };
    }, [baseScene, handleSpacing, normalAngle, offset]);

    const renderMode = useMemo(() => detectRenderMode(), []);
    const triangleParams = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
        initialGeometryMode: configuredScene.geometry,
    });

    return (
        <section style={{ height: "520px", width: "100%" }} aria-label="single-half-plane-demo">
            <EuclideanSceneHost
                scene={configuredScene}
                scenes={[configuredScene]}
                activeSceneId={configuredScene.id}
                onSceneChange={() => {
                    /* no-op: single scene showcase */
                }}
                renderMode={renderMode}
                triangle={triangleParams}
            />
        </section>
    );
}

const meta: Meta<typeof SingleHalfPlaneSceneDemo> = {
    title: "Scenes/Single Half-Plane",
    component: SingleHalfPlaneSceneDemo,
    tags: ["autodocs"],
    args: {
        offset: 0,
        normalAngle: 0,
        handleSpacing: 0.6,
    },
    argTypes: {
        offset: {
            control: { type: "number" },
            description: "Signed offset applied to the half-plane equation n·p + offset = 0.",
            table: {
                type: { summary: "number" },
                defaultValue: { summary: "0" },
            },
        },
        normalAngle: {
            control: { type: "range", min: 0, max: 360, step: 5 },
            description: "Angle of the unit normal in degrees (counter-clockwise).",
            table: {
                type: { summary: "number" },
                defaultValue: { summary: "0" },
            },
        },
        handleSpacing: {
            control: { type: "range", min: 0.2, max: 1.5, step: 0.05 },
            description: "Distance between visual handle points along the half-plane boundary.",
            table: {
                type: { summary: "number" },
                defaultValue: { summary: "0.6" },
            },
        },
    },
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "単一の半平面を使って WebGL 反射パイプラインの動作を確認するシーンです。コントロールで法線角度やオフセットを調整して、距離項がどのように描画へ反映されるかを検証できます。",
            },
        },
        accessibility: {
            element: "[aria-label=single-half-plane-demo]",
        },
    },
};

export default meta;

type Story = StoryObj<typeof SingleHalfPlaneSceneDemo>;

function computeViewport(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const ratio = getCanvasPixelRatio(canvas);
    const width = canvas.width || Math.max(1, (rect.width || 1) * ratio);
    const height = canvas.height || Math.max(1, (rect.height || 1) * ratio);
    const margin = 8 * ratio;
    const size = Math.min(width, height);
    const scale = Math.max(1, size / 2 - margin);
    return { scale, tx: width / 2, ty: height / 2 } as const;
}

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: "Play 関数では単一ハンドルのドラッグと復帰をシミュレートし、反射境界が更新されることを確認します。",
            },
        },
    },
    play: async ({ canvasElement }) => {
        const stage = canvasElement.querySelector("#stage") as HTMLCanvasElement | null;
        if (!stage) {
            throw new Error("Stage canvas not found");
        }

        await expectCanvasFill(stage, {
            points: [
                { x: 0.5, y: 0.5 },
                { x: 0.6, y: 0.5 },
                { x: 0.4, y: 0.5 },
            ],
            minAlpha: 24,
        });

        const readout = canvasElement.querySelector('[data-testid="handle-coordinates"]');
        await waitFor(() => {
            expect(readout?.textContent).toBeTruthy();
        });

        const parsePoints = () => {
            const raw = readout?.textContent ?? "";
            return raw
                ? (JSON.parse(raw) as Array<
                      Array<{ x: number; y: number; id: string; fixed: boolean }>
                  >)
                : [];
        };

        await waitFor(() => {
            expect(parsePoints().length).toBe(1);
        });

        const initialPoints = parsePoints();
        const [_, movable] = initialPoints[0];
        if (!movable) {
            throw new Error("Expected movable control point");
        }

        const viewport = computeViewport(stage);
        const ratio = getCanvasPixelRatio(stage);
        const rect = stage.getBoundingClientRect();
        const startScreen = worldToScreen(viewport, movable);
        const from = {
            clientX: rect.left + startScreen.x / ratio,
            clientY: rect.top + startScreen.y / ratio,
        };
        const targetWorld = {
            x: movable.x + 0.15,
            y: movable.y + 0.1,
        };
        const targetScreen = worldToScreen(viewport, targetWorld);
        const to = {
            clientX: rect.left + targetScreen.x / ratio,
            clientY: rect.top + targetScreen.y / ratio,
        };

        await userEvent.pointer([
            { target: stage, coords: from, keys: "[MouseLeft>]" },
            { coords: to },
            { keys: "[/MouseLeft]" },
        ]);

        await waitFor(() => {
            const moved = parsePoints();
            expect(moved.length).toBe(1);
            const [, movedHandle] = moved[0] ?? [];
            expect(movedHandle).toBeTruthy();
            if (!movedHandle) return;
            expect(
                Math.hypot(movedHandle.x - movable.x, movedHandle.y - movable.y),
            ).toBeGreaterThan(1e-3);
        });

        const movedPoints = parsePoints();
        const [, movedHandle] = movedPoints[0] ?? [];
        if (!movedHandle) {
            throw new Error("Expected handle after move");
        }
        const movedScreen = worldToScreen(viewport, movedHandle);
        const movedCoords = {
            clientX: rect.left + movedScreen.x / ratio,
            clientY: rect.top + movedScreen.y / ratio,
        };

        await userEvent.pointer([
            { target: stage, coords: movedCoords, keys: "[MouseLeft>]" },
            { coords: from },
            { keys: "[/MouseLeft]" },
        ]);

        await waitFor(() => {
            const restored = parsePoints();
            const [, handle] = restored[0] ?? [];
            expect(handle).toBeTruthy();
            if (!handle) return;
            expect(handle.x).toBeCloseTo(movable.x, 2);
            expect(handle.y).toBeCloseTo(movable.y, 2);
        });
    },
};
