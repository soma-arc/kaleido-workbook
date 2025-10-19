import type { ChangeEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Vec2 } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import {
    halfPlaneFromNormalAndOffset,
    halfPlaneOffset,
    normalizeHalfPlane,
} from "@/geom/primitives/halfPlane";
import {
    alignHalfPlaneOrientation,
    controlPointsFromHalfPlanes,
    deriveHalfPlaneFromPoints,
    derivePointsFromHalfPlane,
    type HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import { generateRegularPolygonHalfplanes } from "@/geom/primitives/regularPolygon";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import { getCanvasPixelRatio } from "@/render/canvas";
import { cropToCenteredSquare } from "@/render/crop";
import type { CaptureRequestKind, RenderMode } from "@/render/engine";
import { exportPNG } from "@/render/export";
import type { Viewport } from "@/render/viewport";
import { screenToWorld } from "@/render/viewport";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { DepthControls } from "@/ui/components/DepthControls";
import { EmbedOverlayPanel } from "@/ui/components/EmbedOverlayPanel";
import { HalfPlaneHandleControls } from "@/ui/components/HalfPlaneHandleControls";
import {
    ImageExportControls,
    type ImageExportMode,
    type ImageExportStatus,
} from "@/ui/components/ImageExportControls";
import { ModeControls } from "@/ui/components/ModeControls";
import { PresetSelector } from "@/ui/components/PresetSelector";
import { SnapControls } from "@/ui/components/SnapControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TriangleParamForm } from "@/ui/components/TriangleParamForm";
import { CameraInput } from "@/ui/components/texture/CameraInput";
import { TexturePicker } from "@/ui/components/texture/TexturePicker";
import { useRenderEngineWithCanvas } from "@/ui/hooks/useRenderEngine";
import { useTextureInput } from "@/ui/hooks/useTextureSource";
import { nextOffsetOnDrag, pickHalfPlaneIndex } from "@/ui/interactions/euclideanHalfPlaneDrag";
import { hitTestControlPoints, updateControlPoint } from "@/ui/interactions/halfPlaneControlPoints";
import { DEFAULT_TEXTURE_PRESETS } from "@/ui/texture/presets";
import { getPresetGroupsForGeometry, getPresetsForGeometry } from "@/ui/trianglePresets";
import { downloadDataUrl } from "@/ui/utils/download";
import type { UseTriangleParamsResult } from "../hooks/useTriangleParams";
import {
    type CircleInversionDisplayOptions,
    type CircleInversionRectangleState,
    type CircleInversionState,
    cloneCircleInversionState,
    updateCircleInversionDisplay,
    updateCircleInversionLineFromControls,
    updateCircleInversionRectangleCenter,
} from "./circleInversionConfig";
import { SceneLayout } from "./layouts";
import { SCENE_IDS } from "./sceneDefinitions";
import type { SceneDefinition, SceneId } from "./types";

const HANDLE_DEFAULT_SPACING = 0.6;
const HANDLE_HIT_TOLERANCE_PX = 10;
const CIRCLE_LINE_START_ID = "circle-line-start";
const CIRCLE_LINE_END_ID = "circle-line-end";

const DEFAULT_EUCLIDEAN_PLANES: HalfPlane[] = [
    halfPlaneFromNormalAndOffset({ x: 1, y: 0 }, 0),
    halfPlaneFromNormalAndOffset({ x: 0, y: 1 }, 0),
    halfPlaneFromNormalAndOffset({ x: -Math.SQRT1_2, y: Math.SQRT1_2 }, 0),
];

const MODE_TO_CAPTURE_KIND: Record<ImageExportMode, CaptureRequestKind> = {
    composite: "composite",
    webgl: "webgl",
    "square-composite": "composite",
    "square-webgl": "webgl",
};

const SQUARE_MODES: ReadonlySet<ImageExportMode> = new Set(["square-composite", "square-webgl"]);
function findCircleLineControls(
    controls: HalfPlaneControlPoints[] | null,
): HalfPlaneControlPoints | null {
    if (!controls) return null;
    for (const pair of controls) {
        if (!pair) continue;
        const ids = new Set(pair.map((point) => point.id));
        if (ids.has(CIRCLE_LINE_START_ID) && ids.has(CIRCLE_LINE_END_ID)) {
            return pair;
        }
    }
    return null;
}

type CircleInversionOverlayTarget = {
    kind: "circle-inversion-rectangle";
    rectangle: "primary" | "secondary";
};

function rectangleContains(rect: CircleInversionRectangleState, point: Vec2): boolean {
    const c = Math.cos(-rect.rotation);
    const s = Math.sin(-rect.rotation);
    const dx = point.x - rect.center.x;
    const dy = point.y - rect.center.y;
    const localX = c * dx - s * dy;
    const localY = s * dx + c * dy;
    return (
        Math.abs(localX) <= rect.halfExtents.x + 1e-6 &&
        Math.abs(localY) <= rect.halfExtents.y + 1e-6
    );
}

function hitTestCircleInversionRectangles(
    state: CircleInversionState | null,
    point: Vec2,
): CircleInversionOverlayTarget | null {
    if (!state) {
        return null;
    }
    const overlays: Array<{
        key: CircleInversionOverlayTarget["rectangle"];
        rect: CircleInversionRectangleState;
        visible: boolean;
    }> = [
        {
            key: "secondary",
            rect: state.secondaryRectangle,
            visible:
                state.display.showSecondaryRectangle ||
                state.display.showSecondaryInvertedRectangle,
        },
        {
            key: "primary",
            rect: state.rectangle,
            visible: state.display.showReferenceRectangle || state.display.showInvertedRectangle,
        },
    ];
    for (const overlay of overlays) {
        if (!overlay.visible) continue;
        if (rectangleContains(overlay.rect, point)) {
            return { kind: "circle-inversion-rectangle", rectangle: overlay.key };
        }
    }
    return null;
}

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

function pad(value: number): string {
    return value.toString().padStart(2, "0");
}

function buildFilename(mode: ImageExportMode): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `hp-capture-${mode}-${datePart}-${timePart}.png`;
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

type OverlayDragState = {
    type: "overlay";
    pointerId: number;
    target: CircleInversionOverlayTarget;
    offset: Vec2;
};

type DragState = PlaneDragState | HandleDragState | OverlayDragState;

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
    const {
        canvasRef,
        renderEngineRef,
        renderMode: resolvedRenderMode,
        ready: engineReady,
    } = useRenderEngineWithCanvas({ mode: renderMode });
    const latestEuclideanPlanesRef = useRef<HalfPlane[] | null>(null);
    const [editableHalfPlanes, setEditableHalfPlanes] = useState<HalfPlane[] | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [showHandles, setShowHandles] = useState(false);
    const [handleSpacing, setHandleSpacing] = useState(HANDLE_DEFAULT_SPACING);
    const [handleControls, setHandleControls] = useState<HandleControlsState | null>(null);
    const [circleInversionState, setCircleInversionState] = useState<CircleInversionState | null>(
        () => (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null),
    );
    const sceneCircleInitial = useMemo(
        () => (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null),
        [scene.inversionConfig],
    );
    const effectiveCircleInversion = useMemo(
        () => circleInversionState ?? sceneCircleInitial,
        [circleInversionState, sceneCircleInitial],
    );
    const textureInput = useTextureInput({ presets: DEFAULT_TEXTURE_PRESETS });
    const loadPresetTexture = textureInput.loadPreset;
    const baseTextureSlot = textureInput.slots[TEXTURE_SLOTS.base];
    const baseTextureLayer = baseTextureSlot?.layer ?? null;
    const baseTextureSource = baseTextureLayer?.source ?? null;
    const appliedDefaultPresetId = useRef<string | null>(null);
    const [maxFrameRate, setMaxFrameRate] = useState<number>(60);
    const [maxFrameRateInput, setMaxFrameRateInput] = useState<string>("60");
    const maxFrameRateRef = useRef<number>(60);
    const frameRequestRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const maxFrameRateInputId = useId();
    const multiPlaneSliderId = useId();
    const [exportMode, setExportMode] = useState<ImageExportMode>("composite");
    const [exportStatus, setExportStatus] = useState<ImageExportStatus>(null);

    const isCameraDebugScene = scene.id === SCENE_IDS.euclideanCameraDebug;
    const showTriangleControls = scene.showTriangleControls !== false;
    const toggleHandles = useCallback(() => {
        setShowHandles((prev) => !prev);
    }, []);

    const hasDynamicTexture = useMemo(
        () => textureInput.textures.some((layer) => layer.source?.dynamic === true),
        [textureInput.textures],
    );

    const baseSlotLayer = baseTextureLayer;
    const baseSlotStatus = baseTextureSlot?.status ?? "idle";

    useEffect(() => {
        const presetId = scene.defaultTexturePresetId;
        if (!presetId) {
            appliedDefaultPresetId.current = null;
            return;
        }
        if (baseSlotLayer) {
            appliedDefaultPresetId.current = presetId;
            return;
        }
        if (baseSlotStatus !== "idle") {
            return;
        }
        if (appliedDefaultPresetId.current === presetId) {
            return;
        }
        appliedDefaultPresetId.current = presetId;
        loadPresetTexture(TEXTURE_SLOTS.base, presetId).catch(() => {
            if (appliedDefaultPresetId.current === presetId) {
                appliedDefaultPresetId.current = null;
            }
        });
    }, [scene.defaultTexturePresetId, baseSlotLayer, baseSlotStatus, loadPresetTexture]);

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

    useEffect(() => {
        if (scene.inversionConfig) {
            setCircleInversionState(cloneCircleInversionState(scene.inversionConfig));
        } else {
            setCircleInversionState(null);
        }
    }, [scene.inversionConfig]);

    const controlAssignments = scene.controlAssignments;

    const multiPlaneConfig = scene.multiPlaneConfig ?? null;
    const [multiPlaneSides, setMultiPlaneSides] = useState<number | null>(
        () => multiPlaneConfig?.initialSides ?? null,
    );

    useEffect(() => {
        if (!multiPlaneConfig) {
            return;
        }
        setMultiPlaneSides(multiPlaneConfig.initialSides);
    }, [multiPlaneConfig]);

    const handleMultiPlaneSidesChange = useCallback((nextSides: number) => {
        setMultiPlaneSides(nextSides);
        setEditableHalfPlanes(null);
        setExportStatus(null);
    }, []);

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

    const baseHalfPlanes = useMemo(() => {
        if (scene.geometry !== GEOMETRY_KIND.euclidean) {
            return null;
        }
        if (multiPlaneConfig) {
            const sides = multiPlaneSides ?? multiPlaneConfig.initialSides;
            return generateRegularPolygonHalfplanes(sides, {
                radius: multiPlaneConfig.radius,
                initialAngle: multiPlaneConfig.initialAngle,
            });
        }
        if (scene.initialHalfPlanes) {
            return scene.initialHalfPlanes.map((plane) => normalizeHalfPlane(plane));
        }
        if (paramError) {
            return null;
        }
        try {
            const result = buildEuclideanTriangle(params.p, params.q, params.r);
            return result.boundaries;
        } catch {
            return null;
        }
    }, [
        scene.geometry,
        scene.initialHalfPlanes,
        params,
        paramError,
        multiPlaneConfig,
        multiPlaneSides,
    ]);

    const normalizedHalfPlanes = useMemo(() => {
        if (scene.geometry !== GEOMETRY_KIND.euclidean) {
            return null;
        }
        const base = editableHalfPlanes ?? baseHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        if (!base) return null;
        return base.map((plane) => normalizeHalfPlane(plane));
    }, [scene.geometry, editableHalfPlanes, baseHalfPlanes]);

    useEffect(() => {
        setEditableHalfPlanes(null);
        setDrag(null);
        if (scene.geometry !== GEOMETRY_KIND.euclidean) {
            setHandleControls(null);
            latestEuclideanPlanesRef.current = null;
            return;
        }
        const source = baseHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        const normalized = source.map((plane) => normalizeHalfPlane(plane));
        let nextPoints: HalfPlaneControlPoints[];
        if (scene.initialControlPoints && scene.initialControlPoints.length === normalized.length) {
            nextPoints = scene.initialControlPoints.map((pair) => [
                { ...pair[0] },
                { ...pair[1] },
            ]) as HalfPlaneControlPoints[];
        } else {
            nextPoints = controlPointsFromHalfPlanes(normalized, handleSpacing, controlAssignments);
        }
        setHandleControls({ spacing: handleSpacing, points: nextPoints });
        latestEuclideanPlanesRef.current = normalized;
        setExportStatus(null);
    }, [
        baseHalfPlanes,
        controlAssignments,
        handleSpacing,
        scene.geometry,
        scene.initialControlPoints,
    ]);

    const computeViewport = (canvas: HTMLCanvasElement): Viewport => {
        const rect = canvas.getBoundingClientRect();
        const ratio = getCanvasPixelRatio(canvas);
        const width = canvas.width || Math.max(1, (rect.width || 1) * ratio);
        const height = canvas.height || Math.max(1, (rect.height || 1) * ratio);
        const margin = 8 * ratio;
        const size = Math.min(width, height);
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
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const ratio = getCanvasPixelRatio(canvas);
        return {
            x: (e.clientX - rect.left) * ratio,
            y: (e.clientY - rect.top) * ratio,
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
                if (!shouldUpdate) {
                    return plane;
                }
                const derived = deriveHalfPlaneFromPoints(pair);
                return alignHalfPlaneOrientation(plane, derived);
            });
        },
        [],
    );

    const renderEuclideanScene = useCallback(
        (
            planes: HalfPlane[],
            overridePoints?: HalfPlaneControlPoints[] | null,
            overrideActive?: { planeIndex: number; pointIndex: 0 | 1 } | null,
            overrideInversion?: CircleInversionState | null,
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
            const inversion =
                overrideInversion ??
                circleInversionState ??
                (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null);
            const halfPlanesForRender = scene.inversionConfig ? [] : planes;
            renderEngineRef.current?.render({
                scene,
                geometry: GEOMETRY_KIND.euclidean,
                halfPlanes: halfPlanesForRender,
                handles,
                textures: textureInput.textures,
                inversion: inversion ?? undefined,
            });
        },
        [
            activeHandle,
            currentControlPoints,
            circleInversionState,
            scene,
            scene.supportsHandles,
            showHandles,
            textureInput.textures,
            renderEngineRef,
        ],
    );

    const handleDisplayToggle = useCallback(
        (key: keyof CircleInversionDisplayOptions) => (event: ChangeEvent<HTMLInputElement>) => {
            const checked = event.target.checked;
            const baseState = circleInversionState ?? sceneCircleInitial;
            if (!baseState) {
                return;
            }
            const nextState = updateCircleInversionDisplay(baseState, { [key]: checked });
            if (nextState === baseState) {
                return;
            }
            setCircleInversionState(nextState);
            const planesForRender =
                latestEuclideanPlanesRef.current ??
                normalizedHalfPlanes ??
                DEFAULT_EUCLIDEAN_PLANES;
            renderEuclideanScene(planesForRender, currentControlPoints, null, nextState);
        },
        [
            circleInversionState,
            sceneCircleInitial,
            normalizedHalfPlanes,
            currentControlPoints,
            renderEuclideanScene,
        ],
    );

    useEffect(() => {
        if (!scene.inversionConfig) {
            return;
        }
        const controls = handleControls?.points ?? null;
        const lineControls = findCircleLineControls(controls);
        if (!lineControls) {
            return;
        }
        const baseState = circleInversionState ?? sceneCircleInitial;
        if (!baseState) {
            return;
        }
        const nextState = updateCircleInversionLineFromControls(baseState, lineControls);
        if (nextState === baseState) {
            return;
        }
        setCircleInversionState(nextState);
        const planesForRender =
            latestEuclideanPlanesRef.current ?? normalizedHalfPlanes ?? DEFAULT_EUCLIDEAN_PLANES;
        renderEuclideanScene(planesForRender, controls, null, nextState);
    }, [
        handleControls,
        circleInversionState,
        sceneCircleInitial,
        scene.inversionConfig,
        normalizedHalfPlanes,
        renderEuclideanScene,
    ]);

    useEffect(() => {
        const source = baseTextureSource;
        if (!source || !(source.width > 0) || !(source.height > 0)) {
            return;
        }
        const aspect = source.width / source.height;
        const baseState =
            circleInversionState ??
            sceneCircleInitial ??
            (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null);
        if (!baseState) {
            return;
        }
        const currentHalfExtents = baseState.rectangle.halfExtents;
        const currentAspect =
            baseState.textureAspect ??
            (currentHalfExtents.y > 0 ? currentHalfExtents.x / currentHalfExtents.y : aspect);
        if (Math.abs(currentAspect - aspect) <= 1e-6) {
            return;
        }
        if (!(currentHalfExtents.y > 0)) {
            return;
        }
        const nextState = cloneCircleInversionState(baseState);
        const normalizedHeight = currentHalfExtents.y;
        nextState.rectangle.halfExtents = {
            x: normalizedHeight * aspect,
            y: normalizedHeight,
        };
        nextState.textureAspect = aspect;
        setCircleInversionState(nextState);
    }, [baseTextureSource, circleInversionState, sceneCircleInitial, scene.inversionConfig]);

    const renderHyperbolicScene = useCallback(() => {
        const targetParams = scene.fixedHyperbolicParams ?? params;
        renderEngineRef.current?.render({
            scene,
            geometry: GEOMETRY_KIND.hyperbolic,
            params: targetParams,
            textures: textureInput.textures,
        });
    }, [params, scene, scene.fixedHyperbolicParams, textureInput.textures, renderEngineRef]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (scene.geometry !== GEOMETRY_KIND.euclidean || !normalizedHalfPlanes) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const screen = getPointer(e);
        const ratio = getCanvasPixelRatio(canvas);
        const worldPoint = screenToWorld(viewport, screen);

        const overlayTarget = hitTestCircleInversionRectangles(
            effectiveCircleInversion,
            worldPoint,
        );
        if (overlayTarget) {
            const referenceState =
                circleInversionState ??
                sceneCircleInitial ??
                (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null);
            if (!referenceState) {
                return;
            }
            try {
                canvas.setPointerCapture(e.pointerId);
            } catch {
                // ignore
            }
            const rect =
                overlayTarget.rectangle === "primary"
                    ? referenceState.rectangle
                    : referenceState.secondaryRectangle;
            const offset: Vec2 = {
                x: worldPoint.x - rect.center.x,
                y: worldPoint.y - rect.center.y,
            };
            setDrag({
                type: "overlay",
                pointerId: e.pointerId,
                target: overlayTarget,
                offset,
            });
            return;
        }

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
                HANDLE_HIT_TOLERANCE_PX * ratio,
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

        const idx = pickHalfPlaneIndex(normalizedHalfPlanes, viewport, screen, 8 * ratio);
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

        if (drag.type === "overlay") {
            const pointer = getPointer(e);
            const worldPoint = screenToWorld(viewport, pointer);
            const baseState =
                circleInversionState ??
                sceneCircleInitial ??
                (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null);
            if (!baseState) {
                return;
            }
            const updatedState = updateCircleInversionRectangleCenter(
                baseState,
                drag.target.rectangle,
                {
                    x: worldPoint.x - drag.offset.x,
                    y: worldPoint.y - drag.offset.y,
                },
            );
            let stateForRender = baseState;
            if (updatedState !== baseState) {
                stateForRender = updatedState;
                setCircleInversionState(updatedState);
            }
            const planesForRender =
                latestEuclideanPlanesRef.current ??
                normalizedHalfPlanes ??
                DEFAULT_EUCLIDEAN_PLANES;
            renderEuclideanScene(planesForRender, currentControlPoints, null, stateForRender);
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
        let overrideInversion = circleInversionState ?? sceneCircleInitial ?? null;
        const lineControls = findCircleLineControls(nextPoints);
        if (lineControls) {
            const baseState =
                overrideInversion ??
                (scene.inversionConfig ? cloneCircleInversionState(scene.inversionConfig) : null);
            if (baseState) {
                const nextState = updateCircleInversionLineFromControls(baseState, lineControls);
                if (nextState !== baseState) {
                    overrideInversion = nextState;
                    setCircleInversionState(nextState);
                } else {
                    overrideInversion = baseState;
                }
            }
        }
        renderEuclideanScene(
            updatedPlanes,
            nextPoints,
            {
                planeIndex: drag.planeIndex,
                pointIndex: drag.pointIndex,
            },
            overrideInversion ?? null,
        );
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
        if (!engineReady) {
            return;
        }
        if (scene.geometry === GEOMETRY_KIND.hyperbolic) {
            latestEuclideanPlanesRef.current = null;
            renderHyperbolicScene();
            return;
        }
        if (!normalizedHalfPlanes) return;
        renderEuclideanScene(normalizedHalfPlanes, currentControlPoints, null);
    }, [
        engineReady,
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

    const handleExportImage = useCallback(() => {
        const engine = renderEngineRef.current;
        if (!engine) {
            setExportStatus({
                tone: "error",
                message: "レンダーエンジンの初期化を待っています。",
            });
            return;
        }
        const primaryKind = MODE_TO_CAPTURE_KIND[exportMode];
        let resolvedMode: ImageExportMode = exportMode;
        let canvasForExport = engine.capture(primaryKind);
        let usedKind: CaptureRequestKind = primaryKind;
        if (!canvasForExport && primaryKind === "webgl") {
            canvasForExport = engine.capture("composite");
            if (canvasForExport) {
                usedKind = "composite";
                resolvedMode = SQUARE_MODES.has(exportMode) ? "square-composite" : "composite";
            }
        }
        if (!canvasForExport) {
            setExportStatus({
                tone: "error",
                message: "保存用の描画を取得できませんでした。",
            });
            return;
        }
        if (SQUARE_MODES.has(resolvedMode)) {
            canvasForExport = cropToCenteredSquare(canvasForExport);
        }
        const dataUrl = exportPNG(canvasForExport);
        const filename = buildFilename(resolvedMode);
        const success = downloadDataUrl(filename, dataUrl);
        if (!success) {
            setExportStatus({
                tone: "error",
                message: "ダウンロード操作を開始できませんでした。",
            });
            return;
        }
        if (usedKind !== primaryKind) {
            setExportStatus({
                tone: "warning",
                message: "WebGL が無効化されていたため、Canvas 合成で保存しました。",
            });
        } else {
            setExportStatus({
                tone: "info",
                message: `${filename} を保存しました。`,
            });
        }
    }, [exportMode, renderEngineRef]);

    const handleExportModeChange = useCallback((mode: ImageExportMode) => {
        setExportMode(mode);
        setExportStatus(null);
    }, []);

    const circleInversionDisplayControls = useMemo(() => {
        if (!scene.inversionConfig) {
            return null;
        }
        if (!effectiveCircleInversion) {
            return null;
        }
        const display = effectiveCircleInversion.display;
        return (
            <fieldset
                style={{
                    display: "grid",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148, 163, 184, 0.45)",
                }}
            >
                <legend style={{ fontSize: "0.85rem", fontWeight: 600, opacity: 0.85 }}>
                    Circle Inversion
                </legend>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.showReferenceLine}
                        onChange={handleDisplayToggle("showReferenceLine")}
                    />
                    <span>基準ラインを表示</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.showInvertedLine}
                        onChange={handleDisplayToggle("showInvertedLine")}
                    />
                    <span>反転ラインを表示</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.showReferenceRectangle}
                        onChange={handleDisplayToggle("showReferenceRectangle")}
                    />
                    <span>矩形を表示</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.showInvertedRectangle}
                        onChange={handleDisplayToggle("showInvertedRectangle")}
                    />
                    <span>反転矩形を表示</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.showSecondaryRectangle}
                        onChange={handleDisplayToggle("showSecondaryRectangle")}
                    />
                    <span>サブ矩形を表示</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.showSecondaryInvertedRectangle}
                        onChange={handleDisplayToggle("showSecondaryInvertedRectangle")}
                    />
                    <span>反転サブ矩形を表示</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={display.textureEnabled}
                        onChange={handleDisplayToggle("textureEnabled")}
                    />
                    <span>テクスチャを有効化</span>
                </label>
            </fieldset>
        );
    }, [effectiveCircleInversion, handleDisplayToggle, scene.inversionConfig]);

    const baseControls = (
        <>
            <ModeControls
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSceneChange={onSceneChange}
                renderBackend={resolvedRenderMode}
            />
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
            <ImageExportControls
                mode={exportMode}
                onModeChange={handleExportModeChange}
                onExport={handleExportImage}
                disabled={!engineReady}
                status={exportStatus}
            />
        </>
    );

    const presetControls = showTriangleControls ? (
        <>
            <PresetSelector
                groups={presetGroups}
                activePresetId={activePresetId}
                onSelect={setFromPreset}
                onClear={clearAnchor}
                summary={`Anchor: ${anchor ? `p=${anchor.p}, q=${anchor.q}` : "none"}`}
            />
            <SnapControls snapEnabled={snapEnabled} onToggle={setSnapEnabled} />
        </>
    ) : null;

    const triangleControlsNode = showTriangleControls ? (
        <>
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
    ) : null;

    const handleControlsNode = scene.supportsHandles ? (
        <HalfPlaneHandleControls
            showHandles={showHandles}
            onToggle={setShowHandles}
            spacing={handleSpacing}
            onSpacingChange={setHandleSpacing}
            disabled={scene.geometry !== GEOMETRY_KIND.euclidean}
        />
    ) : null;

    const cameraDebugControlsNode = isCameraDebugScene ? (
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
    ) : null;

    const circleInversionControlsNode = circleInversionDisplayControls;

    const defaultControls = baseControls;

    const controlsExtras = {
        multiPlaneControls: multiPlaneConfig
            ? {
                  sliderId: multiPlaneSliderId,
                  minSides: multiPlaneConfig.minSides,
                  maxSides: multiPlaneConfig.maxSides,
                  value: multiPlaneSides ?? multiPlaneConfig.initialSides,
                  onChange: handleMultiPlaneSidesChange,
              }
            : undefined,
        presetControls,
        triangleControls: triangleControlsNode,
        handleControls: handleControlsNode,
        circleInversionControls: circleInversionControlsNode,
        cameraDebugControls: cameraDebugControlsNode,
        halfPlaneControls: {
            presetGroups,
            activePresetId,
            selectPreset: setFromPreset,
            snapEnabled,
            setSnapEnabled,
        },
    } as const;

    const controls = scene.controlsFactory
        ? scene.controlsFactory({
              scene,
              renderBackend: resolvedRenderMode,
              defaultControls,
              extras: controlsExtras,
          })
        : defaultControls;

    const handleOverlaySnapToggle = useCallback(
        (enabled: boolean) => {
            setSnapEnabled(enabled);
        },
        [setSnapEnabled],
    );

    const overlay = useMemo(() => {
        if (!embed) return null;

        const defaultOverlay = (
            <EmbedOverlayPanel title={scene.label} subtitle="Scene">
                {scene.supportsHandles ? (
                    <button
                        type="button"
                        onClick={toggleHandles}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(148, 163, 184, 0.6)",
                            background: showHandles
                                ? "rgba(59,130,246,0.25)"
                                : "rgba(15,23,42,0.55)",
                            color: "#e2e8f0",
                        }}
                        data-testid="embed-overlay-euclidean-toggle"
                    >
                        {showHandles ? "ハンドルを隠す" : "ハンドルを表示"}
                    </button>
                ) : null}
            </EmbedOverlayPanel>
        );
        const overlayExtras = {
            showHandles,
            toggleHandles,
            halfPlaneControls: {
                presetGroups,
                activePresetId,
                selectPreset: setFromPreset,
                snapEnabled,
                setSnapEnabled: handleOverlaySnapToggle,
            },
            multiPlaneControls: controlsExtras.multiPlaneControls,
        };
        if (!scene.embedOverlayFactory) {
            return defaultOverlay;
        }
        return scene.embedOverlayFactory({
            scene,
            renderBackend: resolvedRenderMode,
            controls: defaultOverlay,
            extras: overlayExtras,
        });
    }, [
        embed,
        resolvedRenderMode,
        scene,
        showHandles,
        toggleHandles,
        presetGroups,
        activePresetId,
        setFromPreset,
        snapEnabled,
        handleOverlaySnapToggle,
        controlsExtras.multiPlaneControls,
    ]);

    const canvas = (
        <>
            {scene.supportsHandles ? (
                <span data-testid="handle-coordinates" style={{ display: "none" }}>
                    {JSON.stringify(handleControls?.points ?? [])}
                </span>
            ) : null}
            {scene.inversionConfig ? (
                <span data-testid="circle-inversion-state" style={{ display: "none" }}>
                    {JSON.stringify(
                        circleInversionState
                            ? circleInversionState
                            : cloneCircleInversionState(scene.inversionConfig),
                    )}
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

    return (
        <SceneLayout
            controls={controls}
            canvas={canvas}
            embed={embed}
            overlay={overlay ?? undefined}
        />
    );
}
