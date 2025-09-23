import { useEffect, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import { createRenderEngine, detectRenderMode, type RenderEngine } from "../render/engine";
import { DepthControls } from "./components/DepthControls";
import { ModeControls } from "./components/ModeControls";
import { PresetSelector } from "./components/PresetSelector";
import { SnapControls } from "./components/SnapControls";
import { StageCanvas } from "./components/StageCanvas";
import { TriangleParamForm } from "./components/TriangleParamForm";
import { useTriangleParams } from "./hooks/useTriangleParams";
import { getPresetsForGeometry, type TrianglePreset } from "./trianglePresets";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

const DEFAULT_EUCLIDEAN_PLANES: HalfPlane[] = [
    { normal: { x: 1, y: 0 }, offset: 0 },
    { normal: { x: 0, y: 1 }, offset: 0 },
    { normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 }, offset: 0 },
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
        paramWarning,
        rRange,
        rSliderValue,
        rStep,
        depthRange,
        geometryMode,
        setParamInput,
        setFromPreset,
        clearAnchor,
        setSnapEnabled: setSnapEnabledState,
        setRFromSlider,
        updateDepth,
        setGeometryMode,
    } = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
    });

    const presets = useMemo<readonly TrianglePreset[]>(
        () => getPresetsForGeometry(geometryMode),
        [geometryMode],
    );

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

    const euclideanHalfPlanes = useMemo(() => {
        if (geometryMode !== GEOMETRY_KIND.euclidean || paramError) {
            return null;
        }
        try {
            const result = buildEuclideanTriangle(params.p, params.q, params.r);
            return result.mirrors;
        } catch {
            return null;
        }
    }, [geometryMode, params, paramError]);

    useEffect(() => {
        if (geometryMode === GEOMETRY_KIND.hyperbolic) {
            renderEngineRef.current?.render({ geometry: GEOMETRY_KIND.hyperbolic, params });
            return;
        }
        const halfPlanes = euclideanHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        renderEngineRef.current?.render({
            geometry: GEOMETRY_KIND.euclidean,
            halfPlanes,
        });
    }, [geometryMode, params, euclideanHalfPlanes]);

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
                    presets={presets}
                    anchor={anchor}
                    onSelect={setFromPreset}
                    onClear={clearAnchor}
                />
                <ModeControls
                    geometryMode={geometryMode}
                    onGeometryChange={setGeometryMode}
                    renderBackend={renderMode}
                />
                <SnapControls snapEnabled={snapEnabled} onToggle={setSnapEnabledState} />
                <TriangleParamForm
                    formInputs={formInputs}
                    params={params}
                    anchor={anchor}
                    paramError={paramError}
                    paramWarning={paramWarning}
                    geometryMode={geometryMode}
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
