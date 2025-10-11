import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor } from "@storybook/test";
import { useMemo } from "react";
import { detectRenderMode } from "@/render/engine";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { SCENE_IDS } from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

function CircleInversionSceneDemo(): JSX.Element {
    const { scenes } = useSceneRegistry();
    const scene = useMemo(() => {
        const match = scenes.find((item) => item.id === SCENE_IDS.euclideanCircleInversion);
        if (!match) {
            throw new Error("Circle inversion scene definition not registered");
        }
        return match;
    }, [scenes]);

    const renderMode = useMemo(() => detectRenderMode(), []);
    const triangleParams = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
        initialGeometryMode: scene.geometry,
    });

    return (
        <section style={{ height: "520px", width: "100%" }} aria-label="circle-inversion-demo">
            <EuclideanSceneHost
                scene={scene}
                scenes={[scene]}
                activeSceneId={scene.id}
                onSceneChange={() => {
                    /* single scene showcase */
                }}
                renderMode={renderMode}
                triangle={triangleParams}
            />
        </section>
    );
}

const meta: Meta<typeof CircleInversionSceneDemo> = {
    title: "Scenes/Circle Inversion",
    component: CircleInversionSceneDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "固定円に対する図形の反転を WebGL シェーダーで描画するシーンです。矩形をドラッグして反転像との対応を確認できます。",
            },
        },
        accessibility: {
            element: "[aria-label=circle-inversion-demo]",
        },
    },
};

export default meta;

type Story = StoryObj<typeof CircleInversionSceneDemo>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const readout = canvasElement.querySelector(
            '[data-testid="circle-inversion-state"]',
        ) as HTMLSpanElement | null;
        await waitFor(() => {
            expect(readout?.textContent).toBeTruthy();
        });
        const parsed = JSON.parse(readout?.textContent ?? "{}");
        expect(parsed.fixedCircle.radius).toBeGreaterThan(0);
        expect(parsed.rectangle.halfExtents.x).toBeGreaterThan(0);
        expect(parsed.rectangle.halfExtents.y).toBeGreaterThan(0);
    },
};
