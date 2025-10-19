import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import { SPHERICAL_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { SceneDefinition } from "@/ui/scenes";
import { SphericalSceneHost } from "@/ui/scenes/SphericalSceneHost";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

describe("SphericalSceneHost", () => {
    const scene: SceneDefinition = {
        key: "sphericalTetrahedron",
        id: "spherical-tetrahedron" as const,
        label: "Spherical Tetrahedron",
        geometry: GEOMETRY_KIND.spherical,
        variant: "tetrahedron",
        description: "Regular tetrahedron face on the unit sphere",
        supportsHandles: true,
        editable: true,
        initialSphericalState: {
            triangle: createRegularTetrahedronTriangle(),
            handles: {},
        },
        renderPipelineId: SPHERICAL_PIPELINE_ID,
    } as const;

    it("renders vertex controls and updates summary when azimuth changes", async () => {
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(
                <SphericalSceneHost
                    scene={scene}
                    scenes={[scene]}
                    activeSceneId={scene.id}
                    onSceneChange={() => {}}
                    embed={false}
                />,
            );
        });

        const azInput = container.querySelector(
            'input[data-testid="vertex-0-azimuth"]',
        ) as HTMLInputElement;
        expect(azInput).toBeInstanceOf(HTMLInputElement);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        await act(async () => {
            setter?.call(azInput, "15");
            azInput.dispatchEvent(new Event("input", { bubbles: true }));
            azInput.dispatchEvent(new Event("change", { bubbles: true }));
            await Promise.resolve();
        });

        const summary = container.querySelector('[data-testid="vertex-0-summary"]') as HTMLElement;
        expect(summary?.textContent ?? "").toContain("Azimuth 15°");

        act(() => {
            root.unmount();
        });
    });

    it("changes anti-aliasing sample count", () => {
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(
                <SphericalSceneHost
                    scene={scene}
                    scenes={[scene]}
                    activeSceneId={scene.id}
                    onSceneChange={() => {}}
                    embed={false}
                />,
            );
        });

        const select = container.querySelector(
            'select[data-testid="aa-samples"]',
        ) as HTMLSelectElement;
        expect(select.value).toBe("4");
        act(() => {
            select.value = "1";
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        expect(select.value).toBe("1");

        act(() => {
            root.unmount();
        });
    });
});
