import { useEffect, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import { createRenderEngine, detectRenderMode, type RenderEngine } from "../render/engine";
import type { Viewport } from "../render/viewport";
import { DepthControls } from "./components/DepthControls";
import { ModeControls } from "./components/ModeControls";
import { PresetSelector } from "./components/PresetSelector";
import { SnapControls } from "./components/SnapControls";
import { StageCanvas } from "./components/StageCanvas";
import { TriangleParamForm } from "./components/TriangleParamForm";
import { useTriangleParams } from "./hooks/useTriangleParams";
import { nextOffsetOnDrag, pickHalfPlaneIndex } from "./interactions/euclideanHalfPlaneDrag";
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
    const [editableHalfPlanes, setEditableHalfPlanes] = useState<HalfPlane[] | null>(null);
    const [drag, setDrag] = useState<null | {
        index: number;
        startOffset: number;
        startScreen: { x: number; y: number };
        normal: { x: number; y: number };
    }>(null);

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

    const editingKey = `${geometryMode}:${params.p}:${params.q}:${params.r}`;
    // Reset editing state when parameters or mode change
    useEffect(() => {
        void editingKey; // mark dependency usage for linter
        setEditableHalfPlanes(null);
        setDrag(null);
    }, [editingKey]);

    const computeViewport = (canvas: HTMLCanvasElement): Viewport => {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || canvas.width || 1;
        const height = rect.height || canvas.height || 1;
        const size = Math.min(width, height);
        const margin = 8;
        const scale = Math.max(1, size / 2 - margin);
        return { scale, tx: width / 2, ty: height / 2 };
    };

    const getPointer = (e: React.PointerEvent<HTMLCanvasElement>) => ({
        x: e.clientX,
        y: e.clientY,
    });

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (geometryMode !== GEOMETRY_KIND.euclidean) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const base = editableHalfPlanes ?? euclideanHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        if (!base || base.length === 0) return;
        const screen = getPointer(e);
        const idx = pickHalfPlaneIndex(base, viewport, screen, 8);
        if (idx < 0) return;
        const unit = normalizeHalfPlane(base[idx]);
        if (!editableHalfPlanes) setEditableHalfPlanes(base.map((p) => normalizeHalfPlane(p)));
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        setDrag({ index: idx, startOffset: unit.offset, startScreen: screen, normal: unit.normal });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drag || geometryMode !== GEOMETRY_KIND.euclidean) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const planes = (editableHalfPlanes ?? euclideanHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES).map(
            (p) => normalizeHalfPlane(p),
        );
        const cur = getPointer(e);
        const next = nextOffsetOnDrag(
            drag.normal,
            drag.startOffset,
            viewport,
            drag.startScreen,
            cur,
        );
        const idx = drag.index;
        const updated = planes.map((p, i) => (i === idx ? { normal: p.normal, offset: next } : p));
        setEditableHalfPlanes(updated);
        renderEngineRef.current?.render({ geometry: GEOMETRY_KIND.euclidean, halfPlanes: updated });
    };

    const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (drag) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }
        setDrag(null);
    };

    useEffect(() => {
        if (geometryMode === GEOMETRY_KIND.hyperbolic) {
            renderEngineRef.current?.render({ geometry: GEOMETRY_KIND.hyperbolic, params });
            return;
        }
        const halfPlanes = editableHalfPlanes ?? euclideanHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        renderEngineRef.current?.render({ geometry: GEOMETRY_KIND.euclidean, halfPlanes });
    }, [geometryMode, params, euclideanHalfPlanes, editableHalfPlanes]);

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
                <StageCanvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUpOrCancel}
                    onPointerCancel={handlePointerUpOrCancel}
                />
            </div>
        </div>
    );
}
