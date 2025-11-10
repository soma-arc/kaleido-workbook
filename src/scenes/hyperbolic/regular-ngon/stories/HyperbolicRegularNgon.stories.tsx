import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "@storybook/test";
import { fireEvent, within } from "@storybook/testing-library";
import { useMemo } from "react";
import { useHyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import { SCENE_IDS } from "@/ui/scenes";
import { HyperbolicSceneHost } from "@/ui/scenes/HyperbolicSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";
import { expectCanvasFill } from "@/ui/stories/canvasAssertions";

const TRIANGLE_N_MAX = 64;
const DEFAULT_TRIANGLE = { p: 3, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 12 } as const;

function HyperbolicRegularNgonDemo(): JSX.Element {
    const { scenes } = useSceneRegistry();
    const scene = useMemo(() => {
        const match = scenes.find((item) => item.id === SCENE_IDS.hyperbolicRegularNgon);
        if (!match) {
            throw new Error("Hyperbolic regular n-gon scene is not registered");
        }
        return match;
    }, [scenes]);

    const triangleParams = useHyperbolicTriangleState({
        initialParams: DEFAULT_TRIANGLE,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
    });

    return (
        <section
            style={{ height: "520px", width: "100%" }}
            aria-label="hyperbolic-regular-ngon-demo"
        >
            <HyperbolicSceneHost
                scene={scene}
                scenes={[scene]}
                activeSceneId={scene.id}
                onSceneChange={() => {
                    /* single-scene showcase */
                }}
                triangle={triangleParams}
                embed
            />
        </section>
    );
}

const meta: Meta<typeof HyperbolicRegularNgonDemo> = {
    title: "Scenes/Hyperbolic Regular n-gon",
    component: HyperbolicRegularNgonDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "Interactively adjust n/q sliders to validate the (n-2)(q-2) > 4 constraint and preview the resulting polygon inside the Poincaré disk.",
            },
        },
        accessibility: {
            element: "[aria-label=hyperbolic-regular-ngon-demo]",
        },
    },
};

export default meta;

type Story = StoryObj<typeof HyperbolicRegularNgonDemo>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = canvasElement.querySelector("canvas");
        expect(canvas).not.toBeNull();
        await expectCanvasFill(canvas as HTMLCanvasElement, { minAlpha: 24 });
        const utilities = within(canvasElement);
        const sliders = utilities.getAllByRole("slider");
        expect(sliders.length).toBeGreaterThanOrEqual(2);
        const qSlider = sliders[1] as HTMLInputElement;
        fireEvent.change(qSlider, { target: { value: "3" } });
        const warning = await utilities.findByText(/\(n-2\)\(q-2\) > 4/);
        expect(warning).toBeTruthy();
    },
};
