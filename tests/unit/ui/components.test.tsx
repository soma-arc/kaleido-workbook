import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { PqrKey } from "@/geom/triangle/snap";
import type { SceneDefinition, SceneId } from "@/ui/scenes";
import { DepthControls } from "../../../src/ui/components/DepthControls";
import { ModeControls } from "../../../src/ui/components/ModeControls";
import { PresetSelector } from "../../../src/ui/components/PresetSelector";
import { SnapControls } from "../../../src/ui/components/SnapControls";
import { StageCanvas } from "../../../src/ui/components/StageCanvas";
import { TriangleParamForm } from "../../../src/ui/components/TriangleParamForm";
import type { TrianglePreset } from "../../../src/ui/hooks/useTriangleParams";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

describe("UI components", () => {
    it("calls handlers when preset buttons are clicked", () => {
        const presets: TrianglePreset[] = [
            { label: "(3,3,3)", p: 3, q: 3, r: 3 },
            { label: "(2,3,7)", p: 2, q: 3, r: 7 },
        ];
        const onSelect = vi.fn();
        const onClear = vi.fn();
        const container = document.createElement("div");
        const root = createRoot(container);

        act(() => {
            root.render(
                <PresetSelector
                    presets={presets}
                    anchor={{ p: 3, q: 3 }}
                    onSelect={onSelect}
                    onClear={onClear}
                />,
            );
        });

        const buttons = Array.from(container.querySelectorAll("button"));
        expect(buttons).toHaveLength(3);
        act(() => {
            buttons[0].click();
        });
        expect(onSelect).toHaveBeenCalledWith(presets[0]);
        act(() => {
            buttons[2].click();
        });
        expect(onClear).toHaveBeenCalledTimes(1);

        act(() => {
            root.unmount();
        });
    });

    it("toggles snap control checkbox", () => {
        const onToggle = vi.fn();
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(<SnapControls snapEnabled onToggle={onToggle} />);
        });
        const checkbox = container.querySelector("input[type=checkbox]") as HTMLInputElement;
        expect(checkbox).not.toBeNull();
        act(() => {
            checkbox.click();
        });
        expect(onToggle).toHaveBeenCalledWith(false);
        act(() => {
            root.unmount();
        });
    });

    it("allows switching scenes", () => {
        const onChange = vi.fn();
        const scenes: SceneDefinition[] = [
            {
                key: "test-hyperbolic",
                id: "hyperbolic-tiling",
                label: "Hyperbolic",
                geometry: GEOMETRY_KIND.hyperbolic,
                variant: "tiling",
                supportsHandles: false,
                editable: false,
            },
            {
                key: "test-euclidean",
                id: "euclidean-half-planes",
                label: "Euclidean",
                geometry: GEOMETRY_KIND.euclidean,
                variant: "half-planes",
                supportsHandles: true,
                editable: true,
            },
        ];
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(
                <ModeControls
                    scenes={scenes}
                    activeSceneId={"hyperbolic-tiling" satisfies SceneId}
                    onSceneChange={onChange}
                    renderBackend="hybrid"
                />,
            );
        });
        const buttons = Array.from(container.querySelectorAll("button"));
        expect(buttons).toHaveLength(2);
        act(() => {
            buttons[1]?.click();
        });
        expect(onChange).toHaveBeenCalledWith("euclidean-half-planes");
        act(() => {
            root.unmount();
        });
    });

    it("forwards input changes in triangle form", () => {
        const onParamChange = vi.fn();
        const onSlider = vi.fn();
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(
                <TriangleParamForm
                    formInputs={{ p: "2", q: "3", r: "7" }}
                    params={{ p: 2, q: 3, r: 7, depth: 2 }}
                    anchor={null}
                    paramError={null}
                    paramWarning="near boundary"
                    geometryMode="hyperbolic"
                    rRange={{ min: 2, max: 10 }}
                    rStep={1}
                    rSliderValue={7}
                    onParamChange={onParamChange}
                    onRSliderChange={onSlider}
                />,
            );
        });
        const inputs = Array.from(container.querySelectorAll("input[type=number]"));
        expect(inputs).toHaveLength(3);
        const pInput = inputs[0];
        act(() => {
            (pInput as HTMLInputElement).value = "4";
            pInput.dispatchEvent(new Event("input", { bubbles: true }));
        });
        expect(onParamChange).toHaveBeenCalledWith("p" as PqrKey, "4");

        const slider = container.querySelector("input[type=range]") as HTMLInputElement;
        act(() => {
            slider.value = "8";
            slider.dispatchEvent(new Event("input", { bubbles: true }));
        });
        expect(onSlider).toHaveBeenCalledWith(8);
        const warning = container.querySelector("p:nth-of-type(2)");
        expect(warning?.textContent).toContain("near boundary");

        act(() => {
            root.unmount();
        });
    });

    it("renders depth controls and propagates changes", () => {
        const onDepth = vi.fn();
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(
                <DepthControls
                    depth={2}
                    depthRange={{ min: 0, max: 10 }}
                    onDepthChange={onDepth}
                />,
            );
        });
        const slider = container.querySelector("input[type=range]") as HTMLInputElement;
        act(() => {
            slider.value = "4";
            slider.dispatchEvent(new Event("input", { bubbles: true }));
        });
        expect(onDepth).toHaveBeenCalledWith(4);
        act(() => {
            root.unmount();
        });
    });

    it("exposes canvas ref in StageCanvas", () => {
        const ref = createRef<HTMLCanvasElement>();
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => {
            root.render(<StageCanvas ref={ref} width={800} height={600} />);
        });
        expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
        act(() => {
            root.unmount();
        });
    });
});
