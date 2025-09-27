import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor } from "@storybook/test";
import { useMemo, useState } from "react";
import { detectRenderMode } from "@/render/engine";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { SCENE_IDS, type SceneId } from "@/ui/scenes";
import { TriangleSceneHost } from "@/ui/scenes/TriangleSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

function HingeSceneDemo(): JSX.Element {
    const { triangleScenes } = useSceneRegistry();
    const [sceneId, setSceneId] = useState<SceneId>(SCENE_IDS.hinge);
    const scene = useMemo(
        () => triangleScenes.find((item) => item.id === sceneId) ?? triangleScenes[0],
        [sceneId, triangleScenes],
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
            <TriangleSceneHost
                scene={scene}
                scenes={triangleScenes}
                activeSceneId={sceneId}
                onSceneChange={setSceneId}
                renderMode={renderMode}
                triangle={triangleParams}
            />
        </div>
    );
}

const meta: Meta<typeof HingeSceneDemo> = {
    title: "Scenes/Hinge Mirrors",
    component: HingeSceneDemo,
    parameters: {
        layout: "fullscreen",
    },
};

export default meta;

type Story = StoryObj<typeof HingeSceneDemo>;

export const Default: Story = {
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

        const initialPoints = parsePoints();
        expect(initialPoints.length).toBeGreaterThanOrEqual(2);

        const rect = stage.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const freeHandleX = centerX;
        const freeHandleY = centerY - rect.height * 0.3;
        const targetX = centerX + rect.width * 0.15;
        const targetY = centerY - rect.height * 0.1;

        await userEvent.pointer([
            {
                target: stage,
                coords: { clientX: freeHandleX, clientY: freeHandleY },
                keys: "[MouseLeft>]",
            },
            { coords: { clientX: targetX, clientY: targetY } },
            { keys: "[/MouseLeft]" },
        ]);

        await waitFor(() => {
            const next = parsePoints();
            expect(next.length).toBeGreaterThan(0);
            const hingeA = next[0]?.[0];
            const hingeB = next[1]?.[0];
            expect(hingeA?.x).toBeCloseTo(initialPoints[0][0].x, 3);
            expect(hingeA?.y).toBeCloseTo(initialPoints[0][0].y, 3);
            expect(hingeB?.x).toBeCloseTo(initialPoints[1][0].x, 3);
            expect(hingeB?.y).toBeCloseTo(initialPoints[1][0].y, 3);
            expect(
                next[0][1].x !== initialPoints[0][1].x || next[0][1].y !== initialPoints[0][1].y,
            ).toBe(true);
        });
    },
};
