import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import {
    deriveHalfPlaneFromPoints,
    derivePointsFromHalfPlane,
    type HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import { screenToWorld } from "@/render/viewport";
import { createRenderEngine, detectRenderMode, type RenderEngine } from "../render/engine";
import type { Viewport } from "../render/viewport";
import { DepthControls } from "./components/DepthControls";
import { HalfPlaneHandleControls } from "./components/HalfPlaneHandleControls";
import { ModeControls } from "./components/ModeControls";
import { PresetSelector } from "./components/PresetSelector";
import { SnapControls } from "./components/SnapControls";
import { StageCanvas } from "./components/StageCanvas";
import { TriangleParamForm } from "./components/TriangleParamForm";
import { useTriangleParams } from "./hooks/useTriangleParams";
import { nextOffsetOnDrag, pickHalfPlaneIndex } from "./interactions/euclideanHalfPlaneDrag";
import {
    controlPointsFromHalfPlanes,
    hitTestControlPoints,
    updateControlPoint,
} from "./interactions/halfPlaneControlPoints";
import { getPresetsForGeometry, type TrianglePreset } from "./trianglePresets";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;
const HANDLE_DEFAULT_SPACING = 0.6;
const HANDLE_HIT_TOLERANCE_PX = 10;

type PlaneDragState = {
    type: "plane";
    pointerId: number;
    index: number;
    startOffset: number;
    startScreen: { x: number; y: number };
    normal: { x: number; y: number };
};

type HandleDragState = {
    type: "handle";
    pointerId: number;
    planeIndex: number;
    pointIndex: 0 | 1;
};

type DragState = PlaneDragState | HandleDragState;

const DEFAULT_EUCLIDEAN_PLANES: HalfPlane[] = [
    { normal: { x: 1, y: 0 }, offset: 0 },
    { normal: { x: 0, y: 1 }, offset: 0 },
    { normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 }, offset: 0 },
];

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderEngineRef = useRef<RenderEngine | null>(null);
    const latestEuclideanPlanesRef = useRef<HalfPlane[] | null>(null);
    const [renderMode] = useState(() => detectRenderMode());
    const [editableHalfPlanes, setEditableHalfPlanes] = useState<HalfPlane[] | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [showHandles, setShowHandles] = useState(false);
    const [handleSpacing, setHandleSpacing] = useState(HANDLE_DEFAULT_SPACING);
    const [handleControls, setHandleControls] = useState<{
        spacing: number;
        points: HalfPlaneControlPoints[];
    } | null>(null);

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

    const normalizedHalfPlanes = useMemo(() => {
        if (geometryMode !== GEOMETRY_KIND.euclidean) {
            return null;
        }
        const base = editableHalfPlanes ?? euclideanHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        if (!base) return null;
        return base.map((plane) => normalizeHalfPlane(plane));
    }, [geometryMode, editableHalfPlanes, euclideanHalfPlanes]);

    const editingKey = `${geometryMode}:${params.p}:${params.q}:${params.r}`;
    // Reset editing state when parameters or mode change
    useEffect(() => {
        void editingKey; // mark dependency usage for linter
        setEditableHalfPlanes(null);
        setDrag(null);
        setHandleControls(null);
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

    useEffect(() => {
        if (!showHandles) {
            setHandleControls(null);
            return;
        }
        if (!normalizedHalfPlanes) {
            setHandleControls(null);
            return;
        }
        setHandleControls((prev) => {
            if (
                !prev ||
                prev.points.length !== normalizedHalfPlanes.length ||
                prev.spacing !== handleSpacing
            ) {
                return {
                    spacing: handleSpacing,
                    points: controlPointsFromHalfPlanes(normalizedHalfPlanes, handleSpacing),
                };
            }
            return prev;
        });
    }, [showHandles, handleSpacing, normalizedHalfPlanes]);

    const getPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const currentControlPoints = handleControls?.points ?? null;
    const activeHandle =
        drag?.type === "handle"
            ? { planeIndex: drag.planeIndex, pointIndex: drag.pointIndex }
            : null;

    const renderEuclideanScene = useCallback(
        (
            planes: HalfPlane[],
            overridePoints?: HalfPlaneControlPoints[] | null,
            overrideActive?: { planeIndex: number; pointIndex: 0 | 1 } | null,
        ) => {
            const handlePoints = overridePoints ?? currentControlPoints;
            const active = overrideActive ?? activeHandle;
            const handles =
                showHandles && handlePoints
                    ? {
                          visible: true,
                          items: handlePoints.map((points, idx) => ({ planeIndex: idx, points })),
                          active: active ?? null,
                      }
                    : undefined;
            latestEuclideanPlanesRef.current = planes;
            renderEngineRef.current?.render({
                geometry: GEOMETRY_KIND.euclidean,
                halfPlanes: planes,
                handles,
            });
        },
        [activeHandle, currentControlPoints, showHandles],
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (geometryMode !== GEOMETRY_KIND.euclidean || !normalizedHalfPlanes) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const screen = getPointer(e);

        if (
            showHandles &&
            currentControlPoints &&
            currentControlPoints.length === normalizedHalfPlanes.length
        ) {
            const hit = hitTestControlPoints(
                currentControlPoints,
                viewport,
                screen,
                HANDLE_HIT_TOLERANCE_PX,
            );
            if (hit) {
                try {
                    canvas.setPointerCapture(e.pointerId);
                } catch {
                    // ignore
                }
                const worldPoint = screenToWorld(viewport, screen);
                const nextPoints = updateControlPoint(
                    currentControlPoints,
                    hit.planeIndex,
                    hit.pointIndex,
                    worldPoint,
                );
                const nextPlanes = normalizedHalfPlanes.map((plane, idx) =>
                    idx === hit.planeIndex ? deriveHalfPlaneFromPoints(nextPoints[idx]) : plane,
                );
                setEditableHalfPlanes(nextPlanes);
                setHandleControls({ spacing: handleSpacing, points: nextPoints });
                setDrag({
                    type: "handle",
                    pointerId: e.pointerId,
                    planeIndex: hit.planeIndex,
                    pointIndex: hit.pointIndex,
                });
                renderEuclideanScene(nextPlanes, nextPoints, hit);
                return;
            }
        }

        const idx = pickHalfPlaneIndex(normalizedHalfPlanes, viewport, screen, 8);
        if (idx < 0) return;
        const unit = normalizedHalfPlanes[idx];
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        const p0 = screenToWorld(viewport, screen);
        const snappedStartOffset = -(unit.normal.x * p0.x + unit.normal.y * p0.y);
        const updatedPlanes = normalizedHalfPlanes.map((plane, i) =>
            i === idx ? { normal: plane.normal, offset: snappedStartOffset } : plane,
        );
        setEditableHalfPlanes(updatedPlanes);
        if (showHandles) {
            setHandleControls((prev) => {
                if (!prev || prev.points.length !== updatedPlanes.length) {
                    return {
                        spacing: handleSpacing,
                        points: controlPointsFromHalfPlanes(updatedPlanes, handleSpacing),
                    };
                }
                const nextPoints = prev.points.map((points, planeIndex) =>
                    planeIndex === idx
                        ? derivePointsFromHalfPlane(updatedPlanes[planeIndex], prev.spacing)
                        : points,
                ) as HalfPlaneControlPoints[];
                return { spacing: prev.spacing, points: nextPoints };
            });
        }
        renderEuclideanScene(updatedPlanes);
        setDrag({
            type: "plane",
            pointerId: e.pointerId,
            index: idx,
            startOffset: snappedStartOffset,
            startScreen: screen,
            normal: unit.normal,
        });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drag || geometryMode !== GEOMETRY_KIND.euclidean) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);

        if (drag.type === "plane") {
            const cur = getPointer(e);
            const nextOffset = nextOffsetOnDrag(
                drag.normal,
                drag.startOffset,
                viewport,
                drag.startScreen,
                cur,
            );
            let updatedPlanes: HalfPlane[] | null = null;
            setEditableHalfPlanes((prev) => {
                const basePlanes = (prev ?? normalizedHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES).map(
                    (plane) => normalizeHalfPlane(plane),
                );
                updatedPlanes = basePlanes.map((plane, idx) =>
                    idx === drag.index ? { normal: plane.normal, offset: nextOffset } : plane,
                );
                return updatedPlanes;
            });
            if (!updatedPlanes) return;
            const resolvedPlanes = updatedPlanes;
            let nextPointsForRender: HalfPlaneControlPoints[] | null = currentControlPoints;
            if (showHandles) {
                setHandleControls((prev) => {
                    if (!prev || prev.points.length !== resolvedPlanes.length) {
                        const points = controlPointsFromHalfPlanes(resolvedPlanes, handleSpacing);
                        nextPointsForRender = points;
                        return { spacing: handleSpacing, points };
                    }
                    const points = prev.points.map((pts, idx) =>
                        idx === drag.index
                            ? derivePointsFromHalfPlane(resolvedPlanes[idx], prev.spacing)
                            : pts,
                    ) as HalfPlaneControlPoints[];
                    nextPointsForRender = points;
                    return { spacing: prev.spacing, points };
                });
            }
            renderEuclideanScene(resolvedPlanes, nextPointsForRender, null);
            return;
        }

        // handle drag
        const world = screenToWorld(viewport, getPointer(e));
        let nextPoints: HalfPlaneControlPoints[] | null = null;
        setHandleControls((prev) => {
            if (!prev) return prev;
            const updatedPoints = updateControlPoint(
                prev.points,
                drag.planeIndex,
                drag.pointIndex,
                world,
            );
            nextPoints = updatedPoints;
            return { spacing: prev.spacing, points: updatedPoints };
        });
        if (!nextPoints) return;
        let updatedPlanes: HalfPlane[] | null = null;
        setEditableHalfPlanes((prev) => {
            const basePlanes = (prev ?? normalizedHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES).map(
                (plane) => normalizeHalfPlane(plane),
            );
            updatedPlanes = basePlanes.map((plane, idx) =>
                idx === drag.planeIndex && nextPoints
                    ? deriveHalfPlaneFromPoints(nextPoints[idx])
                    : plane,
            );
            return updatedPlanes;
        });
        if (!updatedPlanes) return;
        renderEuclideanScene(updatedPlanes, nextPoints, {
            planeIndex: drag.planeIndex,
            pointIndex: drag.pointIndex,
        });
    };

    const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (drag) {
            try {
                e.currentTarget.releasePointerCapture(drag.pointerId);
            } catch {
                // ignore
            }
        }
        setDrag(null);
        if (geometryMode === GEOMETRY_KIND.euclidean) {
            const planes = latestEuclideanPlanesRef.current ?? normalizedHalfPlanes ?? null;
            if (planes) {
                renderEuclideanScene(planes, currentControlPoints, null);
            }
        }
    };

    useEffect(() => {
        if (geometryMode === GEOMETRY_KIND.hyperbolic) {
            latestEuclideanPlanesRef.current = null;
            renderEngineRef.current?.render({ geometry: GEOMETRY_KIND.hyperbolic, params });
            return;
        }
        if (!normalizedHalfPlanes) return;
        renderEuclideanScene(normalizedHalfPlanes, currentControlPoints, null);
    }, [geometryMode, params, normalizedHalfPlanes, currentControlPoints, renderEuclideanScene]);

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
                <HalfPlaneHandleControls
                    showHandles={showHandles}
                    onToggle={setShowHandles}
                    spacing={handleSpacing}
                    onSpacingChange={setHandleSpacing}
                    disabled={geometryMode !== GEOMETRY_KIND.euclidean}
                />
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
