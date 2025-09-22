import { useEffect, useRef, useState } from "react";
import { createRenderEngine, detectRenderMode, type RenderEngine } from "../render/engine";
import { DepthControls } from "./components/DepthControls";
import { PresetSelector } from "./components/PresetSelector";
import { SnapControls } from "./components/SnapControls";
import { StageCanvas } from "./components/StageCanvas";
import { TriangleParamForm } from "./components/TriangleParamForm";
import type { TrianglePreset } from "./hooks/useTriangleParams";
import { useTriangleParams } from "./hooks/useTriangleParams";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

const PQR_PRESETS: TrianglePreset[] = [
    { label: "(3,3,3)", p: 3, q: 3, r: 3 },
    { label: "(2,4,4)", p: 2, q: 4, r: 4 },
    { label: "(2,3,6)", p: 2, q: 3, r: 6 },
];

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderEngineRef = useRef<RenderEngine | null>(null);
    const [renderMode] = useState(() => detectRenderMode());

    const {
        params,
        formInputs,
        anchor,
        snapEnabled,
        paramError,
        rRange,
        rSliderValue,
        rStep,
        depthRange,
        setParamInput,
        setFromPreset,
        clearAnchor,
        setSnapEnabled: setSnapEnabledState,
        setRFromSlider,
        updateDepth,
    } = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = createRenderEngine(canvas, { mode: renderMode });
        renderEngineRef.current = engine;
        return () => {
            renderEngineRef.current = null;
            engine.dispose();
        };
    }, [renderMode]);

    useEffect(() => {
        renderEngineRef.current?.render(params);
    }, [params]);

    return (
        <div
            style={{
                boxSizing: "border-box",
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "minmax(220px, 320px) 1fr",
                height: "100%",
                padding: "16px",
                width: "100%",
            }}
        >
            <div style={{ display: "grid", gap: "12px", alignContent: "start" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Triangle Parameters</h2>
                <PresetSelector
                    presets={PQR_PRESETS}
                    anchor={anchor}
                    onSelect={setFromPreset}
                    onClear={clearAnchor}
                />
                <SnapControls
                    snapEnabled={snapEnabled}
                    renderMode={renderMode}
                    onToggle={setSnapEnabledState}
                />
                <TriangleParamForm
                    formInputs={formInputs}
                    params={params}
                    anchor={anchor}
                    paramError={paramError}
                    rRange={rRange}
                    rStep={rStep}
                    rSliderValue={rSliderValue}
                    onParamChange={setParamInput}
                    onRSliderChange={setRFromSlider}
                />
                <DepthControls
                    depth={params.depth}
                    depthRange={depthRange}
                    onDepthChange={updateDepth}
                />
            </div>
            <div style={{ display: "grid", placeItems: "center" }}>
                <StageCanvas ref={canvasRef} width={800} height={600} />
            </div>
        </div>
    );
}
