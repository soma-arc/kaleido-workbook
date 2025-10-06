import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor } from "@storybook/test";
import { useMemo, useState } from "react";
import { detectRenderMode } from "@/render/engine";
import { type Viewport, worldToScreen } from "@/render/viewport";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { SCENE_IDS, type SceneId } from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";
import { expectCanvasFill } from "./canvasAssertions";
import { REGULAR_POLYGON_COMPONENT_DOC, REGULAR_POLYGON_PLAY_DOC } from "./regularPolygonDocs";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

function computeViewport(canvas: HTMLCanvasElement): Viewport {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 1;
    const height = rect.height || canvas.height || 1;
    const size = Math.min(width, height);
    const margin = 8;
    const scale = Math.max(1, size / 2 - margin);
    return { scale, tx: width / 2, ty: height / 2 };
}

function RegularPentagonDemo(): JSX.Element {
    const { scenes } = useSceneRegistry();
    const [sceneId, setSceneId] = useState<SceneId>(SCENE_IDS.euclideanRegularPentagon);
    const scene = useMemo(
        () => scenes.find((item) => item.id === sceneId) ?? scenes[0],
        [sceneId, scenes],
    );
    const renderMode = useMemo(() => detectRenderMode(), []);
    const triangleParams = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
        initialGeometryMode: scene.geometry,
    });

    return (
        <div style={{ height: "600px", width: "100%" }}>
            <EuclideanSceneHost
                scene={scene}
                scenes={scenes}
                activeSceneId={sceneId}
                onSceneChange={setSceneId}
                renderMode={renderMode}
                triangle={triangleParams}
            />
        </div>
    );
}

const meta: Meta<typeof RegularPentagonDemo> = {
    title: "Scenes/Regular Pentagon",
    component: RegularPentagonDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
        controls: {
            hideNoControlsWarning: true,
        },
        docs: {
            description: {
                component: `${REGULAR_POLYGON_COMPONENT_DOC}\n\n正五角形シーンでは奇数頂点での共有制御点挙動を検証できます。`,
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof RegularPentagonDemo>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `${REGULAR_POLYGON_PLAY_DOC}\n五角形では単一頂点の往復操作を対象とします。`,
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
                { x: 0.48, y: 0.42 },
                { x: 0.54, y: 0.58 },
            ],
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
        const initialPoints = parsePoints();
        expect(initialPoints.length).toBe(5);

        const viewport = computeViewport(stage);
        const rect = stage.getBoundingClientRect();

        let selectedPlane = 0;
        let selectedPoint = 0;
        outer: for (let planeIndex = 0; planeIndex < initialPoints.length; planeIndex++) {
            const pair = initialPoints[planeIndex];
            for (let pointIndex = 0; pointIndex < pair.length; pointIndex++) {
                if (!pair[pointIndex].fixed) {
                    selectedPlane = planeIndex;
                    selectedPoint = pointIndex;
                    break outer;
                }
            }
        }
        const handle = initialPoints[selectedPlane][selectedPoint];
        const start = worldToScreen(viewport, handle);
        const from = {
            clientX: rect.left + start.x,
            clientY: rect.top + start.y,
        };
        const targetWorld = { x: handle.x + 0.08, y: handle.y + 0.05 };
        const targetScreen = worldToScreen(viewport, targetWorld);
        const to = {
            clientX: rect.left + targetScreen.x,
            clientY: rect.top + targetScreen.y,
        };

        await userEvent.pointer([
            { target: stage, coords: from, keys: "[MouseLeft>]" },
            { coords: to },
            { keys: "[/MouseLeft]" },
        ]);

        await waitFor(() => {
            const moved = parsePoints();
            const dragged = moved[selectedPlane][selectedPoint];
            const dx = dragged.x - handle.x;
            const dy = dragged.y - handle.y;
            expect(Math.hypot(dx, dy)).toBeGreaterThan(1e-3);
        });

        const movedPoints = parsePoints();
        const movedHandle = movedPoints[selectedPlane][selectedPoint];
        const movedScreen = worldToScreen(viewport, movedHandle);
        const movedCoords = {
            clientX: rect.left + movedScreen.x,
            clientY: rect.top + movedScreen.y,
        };

        await userEvent.pointer([
            { target: stage, coords: movedCoords, keys: "[MouseLeft>]" },
            { coords: from },
            { keys: "[/MouseLeft]" },
        ]);

        await waitFor(() => {
            const finalPoints = parsePoints();
            const restored = finalPoints[selectedPlane][selectedPoint];
            expect(restored.x).toBeCloseTo(handle.x, 3);
            expect(restored.y).toBeCloseTo(handle.y, 3);
        });
    },
};
