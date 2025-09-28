import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor } from "@storybook/test";
import { useMemo, useState } from "react";
import { detectRenderMode } from "@/render/engine";
import { type Viewport, worldToScreen } from "@/render/viewport";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { SCENE_IDS, type SceneId } from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";
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

function RegularHexagonDemo(): JSX.Element {
    const { scenes } = useSceneRegistry();
    const [sceneId, setSceneId] = useState<SceneId>(SCENE_IDS.euclideanRegularHexagon);
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

const meta: Meta<typeof RegularHexagonDemo> = {
    title: "Scenes/Regular Hexagon",
    component: RegularHexagonDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
        controls: {
            hideNoControlsWarning: true,
        },
        docs: {
            description: {
                component: `${REGULAR_POLYGON_COMPONENT_DOC}\n\n正六角形シーンでは偶数頂点での共有制御点回転を検証できます。`,
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof RegularHexagonDemo>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: `${REGULAR_POLYGON_PLAY_DOC}\n六角形では複数頂点を順番にドラッグ→戻すシナリオを実行します。`,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const stage = canvasElement.querySelector("#stage") as HTMLCanvasElement | null;
        if (!stage) {
            throw new Error("Stage canvas not found");
        }
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
            expect(parsePoints().length).toBe(6);
        });

        const rect = stage.getBoundingClientRect();
        const viewport = computeViewport(stage);
        const vertexIndices = [0, 2, 4];

        for (const vertexIndex of vertexIndices) {
            const currentPoints = parsePoints();
            const handle = currentPoints[vertexIndex]?.[0];
            if (!handle) {
                throw new Error(`Handle for vertex-${vertexIndex} not found`);
            }

            const startScreen = worldToScreen(viewport, handle);
            const from = {
                clientX: rect.left + startScreen.x,
                clientY: rect.top + startScreen.y,
            };
            const targetWorld = {
                x: handle.x + 0.06 * Math.cos(vertexIndex),
                y: handle.y + 0.06 * Math.sin(vertexIndex + 1),
            };
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
                const movedHandle = moved[vertexIndex]?.[0];
                expect(movedHandle).toBeTruthy();
                if (!movedHandle) return;
                const dx = movedHandle.x - handle.x;
                const dy = movedHandle.y - handle.y;
                expect(Math.hypot(dx, dy)).toBeGreaterThan(1e-3);
            });

            const movedPoints = parsePoints();
            const movedHandle = movedPoints[vertexIndex]?.[0];
            if (!movedHandle) {
                throw new Error(`Moved handle for vertex-${vertexIndex} not found`);
            }
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
                const restored = finalPoints[vertexIndex]?.[0];
                expect(restored).toBeTruthy();
                if (!restored) return;
                expect(restored.x).toBeCloseTo(handle.x, 3);
                expect(restored.y).toBeCloseTo(handle.y, 3);
            });
        }
    },
};
