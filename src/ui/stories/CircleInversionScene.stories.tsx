import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor } from "@storybook/test";
import { userEvent, within } from "@storybook/testing-library";
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
                    "固定円に対する図形の反転を WebGL シェーダーで描画するシーンです。矩形や基準ラインの表示切替、反転像のテクスチャ有無をコントロールから操作できます。",
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
        const canvas = within(canvasElement);
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
        expect(parsed.display?.showInvertedLine).toBe(true);

        const handleReadout = canvasElement.querySelector(
            '[data-testid="handle-coordinates"]',
        ) as HTMLSpanElement | null;
        const handles = JSON.parse(handleReadout?.textContent ?? "[]");
        expect(Array.isArray(handles)).toBe(true);
        expect(handles[0]?.[0]?.id).toBe("circle-line-start");
        expect(handles[0]?.[1]?.id).toBe("circle-line-end");

        const invertedLineToggle = await canvas.findByLabelText("反転ラインを表示");
        await userEvent.click(invertedLineToggle);
        await waitFor(() => {
            const updated = JSON.parse(readout?.textContent ?? "{}");
            expect(updated.display?.showInvertedLine).toBe(false);
        });

        const textureToggle = await canvas.findByLabelText("テクスチャを有効化");
        await userEvent.click(textureToggle);
        await waitFor(() => {
            const updated = JSON.parse(readout?.textContent ?? "{}");
            expect(updated.display?.textureEnabled).toBe(false);
        });

        const secondaryToggle = await canvas.findByLabelText("サブ矩形を表示");
        await userEvent.click(secondaryToggle);
        await waitFor(() => {
            const updated = JSON.parse(readout?.textContent ?? "{}");
            expect(updated.display?.showSecondaryRectangle).toBe(false);
        });

        const secondaryInvertedToggle = await canvas.findByLabelText("反転サブ矩形を表示");
        await userEvent.click(secondaryInvertedToggle);
        await waitFor(() => {
            const updated = JSON.parse(readout?.textContent ?? "{}");
            expect(updated.display?.showSecondaryInvertedRectangle).toBe(false);
        });
    },
};
