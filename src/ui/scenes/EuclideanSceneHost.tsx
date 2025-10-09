import type { ChangeEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import {
    halfPlaneFromNormalAndOffset,
    halfPlaneOffset,
    normalizeHalfPlane,
} from "@/geom/primitives/halfPlane";
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
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { DepthControls } from "@/ui/components/DepthControls";
import { HalfPlaneHandleControls } from "@/ui/components/HalfPlaneHandleControls";
import { ModeControls } from "@/ui/components/ModeControls";
import { PresetSelector } from "@/ui/components/PresetSelector";
import { SnapControls } from "@/ui/components/SnapControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TriangleParamForm } from "@/ui/components/TriangleParamForm";
import { CameraInput } from "@/ui/components/texture/CameraInput";
import { TexturePicker } from "@/ui/components/texture/TexturePicker";
import { useTextureInput } from "@/ui/hooks/useTextureSource";
import { nextOffsetOnDrag, pickHalfPlaneIndex } from "@/ui/interactions/euclideanHalfPlaneDrag";
import { hitTestControlPoints, updateControlPoint } from "@/ui/interactions/halfPlaneControlPoints";
import { DEFAULT_TEXTURE_PRESETS } from "@/ui/texture/presets";
import { getPresetGroupsForGeometry, getPresetsForGeometry } from "@/ui/trianglePresets";
import type { UseTriangleParamsResult } from "../hooks/useTriangleParams";
import { SceneLayout } from "./layouts";
import { SCENE_IDS } from "./sceneDefinitions";
import type { SceneDefinition, SceneId } from "./types";

const HANDLE_DEFAULT_SPACING = 0.6;
const HANDLE_HIT_TOLERANCE_PX = 10;

const DEFAULT_EUCLIDEAN_PLANES: HalfPlane[] = [
    halfPlaneFromNormalAndOffset({ x: 1, y: 0 }, 0),
    halfPlaneFromNormalAndOffset({ x: 0, y: 1 }, 0),
    halfPlaneFromNormalAndOffset({ x: -Math.SQRT1_2, y: Math.SQRT1_2 }, 0),
];

function planeWithOffset(plane: HalfPlane, offset: number): HalfPlane {
    const unit = normalizeHalfPlane(plane);
    const currentOffset = halfPlaneOffset(unit);
    const delta = offset - currentOffset;
    const anchor = {
        x: unit.anchor.x - delta * unit.normal.x,
        y: unit.anchor.y - delta * unit.normal.y,
    };
    return normalizeHalfPlane({ anchor, normal: unit.normal });
}

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

/**
 * Renders the Euclidean scene workspace including interactive controls and WebGL-backed previews.
 *
 * カメラデバッグシーンでは requestAnimationFrame による再描画ループを起動し、
 * 入力欄から設定できる最大FPSに従ってカメラテクスチャを更新します。
 */
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
    const textureInput = useTextureInput({ presets: DEFAULT_TEXTURE_PRESETS });
    const [maxFrameRate, setMaxFrameRate] = useState<number>(60);
    const [maxFrameRateInput, setMaxFrameRateInput] = useState<string>("60");
    const maxFrameRateRef = useRef<number>(60);
    const frameRequestRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const maxFrameRateInputId = useId();

    const isCameraDebugScene = scene.id === SCENE_IDS.euclideanCameraDebug;

    const hasDynamicTexture = useMemo(
        () => textureInput.textures.some((layer) => layer.source?.dynamic === true),
        [textureInput.textures],
    );

    // FPS 入力値を安全な整数レンジへ丸め込むヘルパー。
    const clampFrameRate = useCallback((value: number) => {
        if (!Number.isFinite(value)) return 60;
        const rounded = Math.round(value);
        const minimum = 1;
        const maximum = 240;
        return Math.min(Math.max(rounded, minimum), maximum);
    }, []);

    const handleMaxFrameRateChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;
            setMaxFrameRateInput(nextValue);
            const numeric = Number(nextValue);
            if (Number.isFinite(numeric) && numeric > 0) {
                setMaxFrameRate(clampFrameRate(numeric));
            }
        },
        [clampFrameRate],
    );

    const handleMaxFrameRateBlur = useCallback(() => {
        const numeric = Number(maxFrameRateInput);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            const fallback = clampFrameRate(maxFrameRateRef.current);
            setMaxFrameRate(fallback);
            setMaxFrameRateInput(fallback.toString());
            return;
        }
        const clamped = clampFrameRate(numeric);
        setMaxFrameRate(clamped);
        setMaxFrameRateInput(clamped.toString());
    }, [clampFrameRate, maxFrameRateInput]);

    // requestAnimationFrame ループが常に最新の上限FPS値を参照できるよう同期する。
    useEffect(() => {
        maxFrameRateRef.current = clampFrameRate(maxFrameRate);
    }, [clampFrameRate, maxFrameRate]);

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

    const presetGroups = useMemo(
        () => getPresetGroupsForGeometry(scene.geometry),
        [scene.geometry],
    );
    const flatPresets = useMemo(() => getPresetsForGeometry(scene.geometry), [scene.geometry]);
    const activePresetId = useMemo(() => {
        const match = flatPresets.find(
            (preset) => preset.p === params.p && preset.q === params.q && preset.r === params.r,
        );
        return match?.id;
    }, [flatPresets, params]);

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
            return scene.initialHalfPlanes.map((plane) => normalizeHalfPlane(plane));
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
                scene,
                geometry: GEOMETRY_KIND.euclidean,
                halfPlanes: planes,
                handles,
                textures: textureInput.textures,
            });
        },
        [
            activeHandle,
            currentControlPoints,
            scene,
            scene.supportsHandles,
            showHandles,
            textureInput.textures,
        ],
    );

    const renderHyperbolicScene = useCallback(() => {
        renderEngineRef.current?.render({
            scene,
            geometry: GEOMETRY_KIND.hyperbolic,
            params,
            textures: textureInput.textures,
        });
    }, [params, scene, textureInput.textures]);

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
            i === idx ? planeWithOffset(plane, snappedStartOffset) : plane,
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
                    idx === drag.index ? planeWithOffset(plane, nextOffset) : plane,
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

    // カメラデバッグシーンでは dynamic テクスチャがある間だけ rAF ループで再描画する。
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        if (!isCameraDebugScene || !hasDynamicTexture) {
            if (frameRequestRef.current !== null) {
                cancelAnimationFrame(frameRequestRef.current);
                frameRequestRef.current = null;
            }
            lastFrameTimeRef.current = 0;
            return;
        }

        let cancelled = false;
        const renderFrame = () => {
            // 平面データが無いケースでもデフォルトを利用して描画継続。
            const fallbackPlanes =
                latestEuclideanPlanesRef.current ??
                normalizedHalfPlanes ??
                DEFAULT_EUCLIDEAN_PLANES;
            renderEuclideanScene(fallbackPlanes);
        };

        const tick = (timestamp: number) => {
            if (cancelled) {
                return;
            }
            const minIntervalMs = 1000 / maxFrameRateRef.current;
            if (
                lastFrameTimeRef.current === 0 ||
                timestamp - lastFrameTimeRef.current >= minIntervalMs
            ) {
                lastFrameTimeRef.current = timestamp;
                renderFrame();
            }
            frameRequestRef.current = window.requestAnimationFrame(tick);
        };

        frameRequestRef.current = window.requestAnimationFrame(tick);

        return () => {
            cancelled = true;
            if (frameRequestRef.current !== null) {
                cancelAnimationFrame(frameRequestRef.current);
                frameRequestRef.current = null;
            }
        };
    }, [hasDynamicTexture, isCameraDebugScene, normalizedHalfPlanes, renderEuclideanScene]);

    const controls = (
        <>
            <ModeControls
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSceneChange={onSceneChange}
                renderBackend={renderMode}
            />
            <PresetSelector
                groups={presetGroups}
                activePresetId={activePresetId}
                onSelect={setFromPreset}
                onClear={clearAnchor}
                summary={`Anchor: ${anchor ? `p=${anchor.p}, q=${anchor.q}` : "none"}`}
            />
            <SnapControls snapEnabled={snapEnabled} onToggle={setSnapEnabled} />
            <TexturePicker
                slot={TEXTURE_SLOTS.base}
                state={textureInput.slots[TEXTURE_SLOTS.base]}
                presets={textureInput.presets}
                onSelectFile={(file) => textureInput.loadFile(TEXTURE_SLOTS.base, file)}
                onSelectPreset={(id) => textureInput.loadPreset(TEXTURE_SLOTS.base, id)}
                onClear={() => textureInput.disable(TEXTURE_SLOTS.base)}
            />
            <CameraInput
                slot={TEXTURE_SLOTS.camera}
                state={textureInput.slots[TEXTURE_SLOTS.camera]}
                onEnable={() => textureInput.enableCamera(TEXTURE_SLOTS.camera)}
                onDisable={() => textureInput.disable(TEXTURE_SLOTS.camera)}
            />
            {isCameraDebugScene && (
                <label
                    htmlFor={maxFrameRateInputId}
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                    <span>カメラ最大FPS</span>
                    <input
                        id={maxFrameRateInputId}
                        type="number"
                        min={1}
                        max={240}
                        step={1}
                        value={maxFrameRateInput}
                        onChange={handleMaxFrameRateChange}
                        onBlur={handleMaxFrameRateBlur}
                    />
                </label>
            )}
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
        </>
    );

    const canvas = (
        <>
            {handleControls && scene.supportsHandles ? (
                <span data-testid="handle-coordinates" style={{ display: "none" }}>
                    {JSON.stringify(handleControls.points)}
                </span>
            ) : null}
            <StageCanvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
                style={{ border: "none", width: "100%", height: "100%" }}
            />
        </>
    );

    return <SceneLayout controls={controls} canvas={canvas} embed={embed} />;
}
