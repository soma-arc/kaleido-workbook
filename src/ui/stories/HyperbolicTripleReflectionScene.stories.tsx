import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "@storybook/test";
import { useMemo } from "react";
import { detectRenderMode } from "@/render/engine";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { SCENE_IDS } from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";
import { expectCanvasFill } from "./canvasAssertions";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

function HyperbolicTripleReflectionDemo(): JSX.Element {
    const { scenes } = useSceneRegistry();
    const scene = useMemo(() => {
        const match = scenes.find((item) => item.id === SCENE_IDS.hyperbolicTripleReflection);
        if (!match) {
            throw new Error("Hyperbolic triple reflection scene is not registered");
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
        <section
            style={{ height: "520px", width: "100%" }}
            aria-label="hyperbolic-triple-reflection-demo"
        >
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

const meta: Meta<typeof HyperbolicTripleReflectionDemo> = {
    title: "Scenes/Hyperbolic Triple Reflection",
    component: HyperbolicTripleReflectionDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "3 本のジオデシック（円）で構成された (3,3,3) 角度のミラー配置を描画し、反転回数に基づいた着色を確認できます。",
            },
        },
        accessibility: {
            element: "[aria-label=hyperbolic-triple-reflection-demo]",
        },
    },
};

export default meta;

type Story = StoryObj<typeof HyperbolicTripleReflectionDemo>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = canvasElement.querySelector("canvas");
        expect(canvas).not.toBeNull();
        await expectCanvasFill(canvas as HTMLCanvasElement, { minAlpha: 32 });
        const numberInputs = canvasElement.querySelectorAll("input[type=number]");
        expect(numberInputs.length).toBe(0);
    },
};
