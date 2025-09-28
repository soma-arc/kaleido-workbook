import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import {
    controlPointsFromHalfPlanes,
    deriveHalfPlaneFromPoints,
    derivePointsFromHalfPlane,
    type HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import { createRenderEngine, type RenderEngine, type RenderMode } from "@/render/engine";
import type { Viewport } from "@/render/viewport";
import { screenToWorld } from "@/render/viewport";
import { DepthControls } from "@/ui/components/DepthControls";
import { HalfPlaneHandleControls } from "@/ui/components/HalfPlaneHandleControls";
import { ModeControls } from "@/ui/components/ModeControls";
import { PresetSelector } from "@/ui/components/PresetSelector";
import { SnapControls } from "@/ui/components/SnapControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TriangleParamForm } from "@/ui/components/TriangleParamForm";
import { nextOffsetOnDrag, pickHalfPlaneIndex } from "@/ui/interactions/euclideanHalfPlaneDrag";
import { hitTestControlPoints, updateControlPoint } from "@/ui/interactions/halfPlaneControlPoints";
import { getPresetsForGeometry, type TrianglePreset } from "@/ui/trianglePresets";
import type { UseTriangleParamsResult } from "../hooks/useTriangleParams";
import type { SceneDefinition, SceneId } from "./types";

const HANDLE_DEFAULT_SPACING = 0.6;
const HANDLE_HIT_TOLERANCE_PX = 10;

const DEFAULT_EUCLIDEAN_PLANES: HalfPlane[] = [
    { normal: { x: 1, y: 0 }, offset: 0 },
    { normal: { x: 0, y: 1 }, offset: 0 },
    { normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 }, offset: 0 },
];

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
    controlPointId: string | null;
};

type DragState = PlaneDragState | HandleDragState;

export type EuclideanSceneHostProps = {
    scene: SceneDefinition;
    scenes: SceneDefinition[];
    activeSceneId: SceneId;
    onSceneChange: (id: SceneId) => void;
    renderMode: RenderMode;
    triangle: UseTriangleParamsResult;
    embed?: boolean;
};

type HandleControlsState = {
    spacing: number;
    points: HalfPlaneControlPoints[];
};

export function EuclideanSceneHost({
    scene,
    scenes,
    activeSceneId,
    onSceneChange,
    renderMode,
    triangle,
    embed = false,
}: EuclideanSceneHostProps): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderEngineRef = useRef<RenderEngine | null>(null);
    const latestEuclideanPlanesRef = useRef<HalfPlane[] | null>(null);
    const [editableHalfPlanes, setEditableHalfPlanes] = useState<HalfPlane[] | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [showHandles, setShowHandles] = useState(false);
    const [handleSpacing, setHandleSpacing] = useState(HANDLE_DEFAULT_SPACING);
    const [handleControls, setHandleControls] = useState<HandleControlsState | null>(null);

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
        setSnapEnabled,
        setRFromSlider,
        updateDepth,
        setGeometryMode,
    } = triangle;

    useEffect(() => {
        if (geometryMode !== scene.geometry) {
            setGeometryMode(scene.geometry);
        }
    }, [geometryMode, scene.geometry, setGeometryMode]);

    useEffect(() => {
        if (!scene.supportsHandles) {
            setShowHandles(false);
            return;
        }
        if (
            scene.controlAssignments?.some((assignment) => assignment.fixed) ||
            scene.initialControlPoints
        ) {
            setShowHandles(true);
        }
    }, [scene.supportsHandles, scene.controlAssignments, scene.initialControlPoints]);

    useEffect(() => {
        if (!scene.supportsHandles) return;
        const nextSpacing = scene.defaultHandleSpacing ?? HANDLE_DEFAULT_SPACING;
        setHandleSpacing(nextSpacing);
    }, [scene.supportsHandles, scene.defaultHandleSpacing]);

    const controlAssignments = scene.controlAssignments;

    const presets = useMemo<readonly TrianglePreset[]>(
        () => getPresetsForGeometry(scene.geometry),
        [scene.geometry],
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

    const baseHalfPlanes = useMemo(() => {
        if (scene.geometry !== GEOMETRY_KIND.euclidean) {
            return null;
        }
        if (scene.initialHalfPlanes) {
            return scene.initialHalfPlanes.map((plane) => ({
                normal: { ...plane.normal },
                offset: plane.offset,
            }));
        }
        if (paramError) {
            return null;
        }
        try {
            const result = buildEuclideanTriangle(params.p, params.q, params.r);
            return result.mirrors;
        } catch {
            return null;
        }
    }, [scene.geometry, scene.initialHalfPlanes, params, paramError]);

    const normalizedHalfPlanes = useMemo(() => {
        if (scene.geometry !== GEOMETRY_KIND.euclidean) {
            return null;
        }
        const base = editableHalfPlanes ?? baseHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        if (!base) return null;
        return base.map((plane) => normalizeHalfPlane(plane));
    }, [scene.geometry, editableHalfPlanes, baseHalfPlanes]);

    const editingKey = `${scene.id}:${params.p}:${params.q}:${params.r}`;
    useEffect(() => {
        void editingKey;
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
        if (!scene.supportsHandles || !showHandles) {
            setHandleControls(null);
            return;
        }
        if (!normalizedHalfPlanes) {
            setHandleControls(null);
            return;
        }
        setHandleControls((prev) => {
            const planeCount = normalizedHalfPlanes.length;
            if (!prev || prev.points.length !== planeCount) {
                if (
                    scene.initialControlPoints &&
                    scene.initialControlPoints.length === planeCount
                ) {
                    const cloned = scene.initialControlPoints.map((pair) => [
                        { ...pair[0] },
                        { ...pair[1] },
                    ]) as HalfPlaneControlPoints[];
                    return { spacing: handleSpacing, points: cloned };
                }
                return {
                    spacing: handleSpacing,
                    points: controlPointsFromHalfPlanes(
                        normalizedHalfPlanes,
                        handleSpacing,
                        controlAssignments,
                    ),
                };
            }
            if (prev.spacing !== handleSpacing) {
                return { spacing: handleSpacing, points: prev.points };
            }
            return prev;
        });
    }, [
        scene.supportsHandles,
        showHandles,
        handleSpacing,
        normalizedHalfPlanes,
        controlAssignments,
        scene.initialControlPoints,
    ]);

    const getPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const currentControlPoints = handleControls?.points ?? null;
    const allowPlaneDrag = scene.allowPlaneDrag !== false;
    const activeHandle =
        drag?.type === "handle"
            ? { planeIndex: drag.planeIndex, pointIndex: drag.pointIndex }
            : null;

    const recomputePlanesFromControls = useCallback(
        (
            sourcePlanes: HalfPlane[],
            points: HalfPlaneControlPoints[],
            controlPointId: string | null,
            primaryIndex: number,
        ): HalfPlane[] => {
            return sourcePlanes.map((plane, idx) => {
                const pair = points[idx];
                if (!pair) return plane;
                const shouldUpdate = controlPointId
                    ? pair.some((point) => point.id === controlPointId)
                    : idx === primaryIndex;
                return shouldUpdate ? deriveHalfPlaneFromPoints(pair) : plane;
            });
        },
        [],
    );

    const renderEuclideanScene = useCallback(
        (
            planes: HalfPlane[],
            overridePoints?: HalfPlaneControlPoints[] | null,
            overrideActive?: { planeIndex: number; pointIndex: 0 | 1 } | null,
        ) => {
            const handlePoints = overridePoints ?? currentControlPoints;
            const active = overrideActive ?? activeHandle;
            const handles =
                scene.supportsHandles && showHandles && handlePoints
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
        [activeHandle, currentControlPoints, scene.supportsHandles, showHandles],
    );

    const renderHyperbolicScene = useCallback(() => {
        renderEngineRef.current?.render({ geometry: GEOMETRY_KIND.hyperbolic, params });
    }, [params]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (scene.geometry !== GEOMETRY_KIND.euclidean || !normalizedHalfPlanes) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const screen = getPointer(e);

        if (
            scene.supportsHandles &&
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
                const draggedControlPointId =
                    currentControlPoints[hit.planeIndex]?.[hit.pointIndex]?.id ?? null;
                const nextPoints = updateControlPoint(
                    currentControlPoints,
                    hit.planeIndex,
                    hit.pointIndex,
                    worldPoint,
                );
                const nextPlanes = recomputePlanesFromControls(
                    normalizedHalfPlanes,
                    nextPoints,
                    draggedControlPointId,
                    hit.planeIndex,
                );
                setEditableHalfPlanes(nextPlanes);
                setHandleControls({ spacing: handleSpacing, points: nextPoints });
                setDrag({
                    type: "handle",
                    pointerId: e.pointerId,
                    planeIndex: hit.planeIndex,
                    pointIndex: hit.pointIndex,
                    controlPointId: draggedControlPointId,
                });
                renderEuclideanScene(nextPlanes, nextPoints, hit);
                return;
            }
        }

        if (!allowPlaneDrag) {
            return;
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
        if (scene.supportsHandles && showHandles) {
            setHandleControls((prev) => {
                if (!prev || prev.points.length !== updatedPlanes.length) {
                    return {
                        spacing: handleSpacing,
                        points: controlPointsFromHalfPlanes(
                            updatedPlanes,
                            handleSpacing,
                            controlAssignments,
                        ),
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
        if (!drag || scene.geometry !== GEOMETRY_KIND.euclidean) return;
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
            const resolvedPlanes: HalfPlane[] = updatedPlanes;
            let nextPointsForRender: HalfPlaneControlPoints[] | null = currentControlPoints;
            if (scene.supportsHandles && showHandles) {
                setHandleControls((prev) => {
                    if (!prev || prev.points.length !== resolvedPlanes.length) {
                        const points = controlPointsFromHalfPlanes(
                            resolvedPlanes,
                            handleSpacing,
                            controlAssignments,
                        );
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
            renderEuclideanScene(resolvedPlanes, nextPointsForRender, {
                planeIndex: drag.index,
                pointIndex: 0,
            });
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
            if (!nextPoints) return prev;
            const basePlanes = (prev ?? normalizedHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES).map(
                (plane) => normalizeHalfPlane(plane),
            );
            updatedPlanes = recomputePlanesFromControls(
                basePlanes,
                nextPoints,
                drag.controlPointId,
                drag.planeIndex,
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
        if (scene.geometry === GEOMETRY_KIND.euclidean) {
            const planes = latestEuclideanPlanesRef.current ?? normalizedHalfPlanes ?? null;
            if (planes) {
                renderEuclideanScene(planes, currentControlPoints, null);
            }
        }
    };

    useEffect(() => {
        if (scene.geometry === GEOMETRY_KIND.hyperbolic) {
            latestEuclideanPlanesRef.current = null;
            renderHyperbolicScene();
            return;
        }
        if (!normalizedHalfPlanes) return;
        renderEuclideanScene(normalizedHalfPlanes, currentControlPoints, null);
    }, [
        scene.geometry,
        normalizedHalfPlanes,
        currentControlPoints,
        renderEuclideanScene,
        renderHyperbolicScene,
    ]);

    const stageContainer = (
        <div
            style={
                embed
                    ? {
                          position: "relative",
                          width: "100%",
                          maxWidth: "1280px",
                          aspectRatio: "16 / 9",
                          background: "#111",
                          borderRadius: 8,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                          overflow: "hidden",
                      }
                    : { display: "grid", placeItems: "center", position: "relative" }
            }
        >
            {handleControls && scene.supportsHandles ? (
                <span data-testid="handle-coordinates" style={{ display: "none" }}>
                    {JSON.stringify(handleControls.points)}
                </span>
            ) : null}
            <StageCanvas
                ref={canvasRef}
                width={embed ? 1280 : 800}
                height={embed ? 720 : 600}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
                style={
                    embed
                        ? {
                              border: "none",
                              width: "100%",
                              height: "100%",
                          }
                        : undefined
                }
            />
        </div>
    );

    if (embed) {
        return (
            <div
                style={{
                    boxSizing: "border-box",
                    display: "grid",
                    placeItems: "center",
                    width: "100%",
                    minHeight: "100vh",
                    padding: "24px",
                    background: "#0b0b0b",
                }}
            >
                {stageContainer}
            </div>
        );
    }

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
                <ModeControls
                    scenes={scenes}
                    activeSceneId={activeSceneId}
                    onSceneChange={onSceneChange}
                    renderBackend={renderMode}
                />
                <PresetSelector
                    presets={presets as TrianglePreset[]}
                    anchor={anchor}
                    onSelect={setFromPreset}
                    onClear={clearAnchor}
                />
                <SnapControls snapEnabled={snapEnabled} onToggle={setSnapEnabled} />
                {scene.supportsHandles && (
                    <HalfPlaneHandleControls
                        showHandles={showHandles}
                        onToggle={setShowHandles}
                        spacing={handleSpacing}
                        onSpacingChange={setHandleSpacing}
                        disabled={scene.geometry !== GEOMETRY_KIND.euclidean}
                    />
                )}
                <TriangleParamForm
                    formInputs={formInputs}
                    params={params}
                    anchor={anchor}
                    paramError={paramError}
                    paramWarning={paramWarning}
                    geometryMode={scene.geometry}
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
            {stageContainer}
        </div>
    );
}
