import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor } from "@storybook/test";
import { useMemo, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { SceneDefinition, SceneId } from "@/ui/scenes";
import { SphericalSceneHost } from "@/ui/scenes/SphericalSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";

function SphericalSceneDemo(): JSX.Element {
    const { scenes } = useSceneRegistry();
    const sphericalScenes = useMemo<SceneDefinition[]>(
        () => scenes.filter((item) => item.geometry === GEOMETRY_KIND.spherical),
        [scenes],
    );
    const fallbackScene = sphericalScenes[0] ?? scenes[0];
    const [sceneId, setSceneId] = useState<SceneId>(fallbackScene.id);
    const scene = useMemo(
        () => sphericalScenes.find((item) => item.id === sceneId) ?? fallbackScene,
        [fallbackScene, sceneId, sphericalScenes],
    );

    if (!scene) {
        return <div>Sphere rendering demo unavailable.</div>;
    }

    return (
        <div style={{ height: "520px", width: "100%" }}>
            <SphericalSceneHost
                scene={scene}
                scenes={sphericalScenes.length > 0 ? sphericalScenes : scenes}
                activeSceneId={sceneId}
                onSceneChange={setSceneId}
                embed={false}
            />
        </div>
    );
}

const meta: Meta<typeof SphericalSceneDemo> = {
    title: "Scenes/Spherical Triangle",
    component: SphericalSceneDemo,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SphericalSceneDemo>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const summary = await waitFor(() => {
            const element = canvasElement.querySelector(
                '[data-testid="vertex-0-summary"]',
            ) as HTMLElement | null;
            expect(element).not.toBeNull();
            return element;
        });
        expect(summary.textContent ?? "").toContain("Azimuth");

        const azInput = canvasElement.querySelector(
            'input[data-testid="vertex-0-azimuth"]',
        ) as HTMLInputElement | null;
        expect(azInput).toBeTruthy();
        if (!azInput) return;
        await userEvent.clear(azInput);
        await userEvent.type(azInput, "12");
        await userEvent.tab();

        await waitFor(() => {
            expect(summary.textContent ?? "").toContain("Azimuth 12");
        });

        const select = canvasElement.querySelector(
            'select[data-testid="aa-samples"]',
        ) as HTMLSelectElement | null;
        expect(select).toBeTruthy();
        if (!select) return;
        await userEvent.selectOptions(select, "1");
        await waitFor(() => {
            expect(select.value).toBe("1");
        });
    },
};
