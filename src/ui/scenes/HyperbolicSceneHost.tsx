import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { getCanvasPixelRatio } from "@/render/canvas";
import type { GeometryRenderRequest, ViewportModifier } from "@/render/engine";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { ModeControls } from "@/ui/components/ModeControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TexturePicker } from "@/ui/components/texture/TexturePicker";
import type { HyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import { usePanZoomState } from "@/ui/hooks/usePanZoomState";
import { useRenderEngineWithCanvas } from "@/ui/hooks/useRenderEngine";
import { useTextureInput } from "@/ui/hooks/useTextureSource";
import type {
    HyperbolicTripleReflectionUniforms,
    SceneDefinition,
    SceneId,
} from "@/ui/scenes/types";
import {
    createDefaultEmbedOverlay,
    resolveSceneControls,
    resolveSceneEmbedOverlay,
    SceneLayout,
    STAGE_CANVAS_BASE_STYLE,
} from "./layouts";
import type { SceneContextExtras } from "./types";

export type HyperbolicSceneHostProps = {
    scene: SceneDefinition;
    scenes: SceneDefinition[];
    activeSceneId: SceneId;
    onSceneChange: (id: SceneId) => void;
    triangle: HyperbolicTriangleState;
    embed?: boolean;
};

export function HyperbolicSceneHost({
    scene,
    scenes,
    activeSceneId,
    onSceneChange,
    triangle,
    embed = false,
}: HyperbolicSceneHostProps): JSX.Element {
    const { canvasRef, renderEngineRef, renderMode, ready } = useRenderEngineWithCanvas();
    const textureInput = useTextureInput();
    const sliderId = useId();
    const triangleSliderId = `${sliderId}-triangle`;
    const createId = useCallback((suffix: string) => `${sliderId}-${suffix}`, [sliderId]);
    const binding = scene.hyperbolicBindingFactory?.({
        scene,
        triangle,
        renderMode,
        embed,
        baseSliderId: sliderId,
        triangleSliderId,
        createId,
    });
    const bindingUniforms = binding?.uniforms as HyperbolicTripleReflectionUniforms | undefined;
    const paramsOverride = binding?.paramsOverride;

    const panZoomLimits = useMemo(() => ({ minScale: 0.25, maxScale: 8 }), []);
    const computeBaseViewport = useCallback((canvasElement: HTMLCanvasElement) => {
        const rect = canvasElement.getBoundingClientRect();
        const ratio = getCanvasPixelRatio(canvasElement);
        const width = canvasElement.width || Math.max(1, (rect.width || 1) * ratio);
        const height = canvasElement.height || Math.max(1, (rect.height || 1) * ratio);
        const margin = 8 * ratio;
        const size = Math.min(width, height);
        const scale = Math.max(1, size / 2 - margin);
        return { scale, tx: width / 2, ty: height / 2 };
    }, []);
    const panZoomState = usePanZoomState(computeBaseViewport, panZoomLimits);
    const {
        modifierRef: panZoomModifierRef,
        getViewport: getPanZoomViewport,
        panBy: panCanvasBy,
        zoomAt: zoomCanvasAt,
        reset: resetPanZoom,
    } = panZoomState;
    const panDragRef = useRef<{ pointerId: number; last: { x: number; y: number } } | null>(null);
    const getCanvasPoint = useCallback(
        (canvasElement: HTMLCanvasElement, clientX: number, clientY: number) => {
            const rect = canvasElement.getBoundingClientRect();
            const ratio = getCanvasPixelRatio(canvasElement);
            return {
                x: (clientX - rect.left) * ratio,
                y: (clientY - rect.top) * ratio,
            };
        },
        [],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: reset pan/zoom whenever scene switches
    useEffect(() => {
        resetPanZoom();
        panDragRef.current = null;
    }, [scene.id, resetPanZoom]);

    const renderHyperbolicScene = useCallback(
        (viewportModifierOverride?: ViewportModifier) => {
            if (scene.geometry !== GEOMETRY_KIND.hyperbolic) {
                return;
            }
            const engine = renderEngineRef.current;
            const canvas = canvasRef.current;
            if (!engine || !canvas || !ready) {
                return;
            }
            const params = paramsOverride ?? scene.fixedHyperbolicParams ?? triangle.params;
            const request: GeometryRenderRequest = {
                geometry: GEOMETRY_KIND.hyperbolic,
                params,
                scene,
                textures: textureInput.textures,
                viewportModifier: viewportModifierOverride
                    ? viewportModifierOverride
                    : scene.supportsPanZoom
                      ? panZoomModifierRef.current
                      : undefined,
            };
            if (bindingUniforms) {
                request.sceneUniforms = bindingUniforms;
            }
            engine.render(request);
        },
        [
            scene,
            triangle,
            paramsOverride,
            textureInput.textures,
            ready,
            renderEngineRef,
            canvasRef,
            bindingUniforms,
            panZoomModifierRef,
        ],
    );

    useEffect(() => {
        renderHyperbolicScene();
    }, [renderHyperbolicScene]);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!scene.supportsPanZoom) {
                return;
            }
            const canvasElement = canvasRef.current ?? event.currentTarget;
            if (!canvasElement) {
                return;
            }
            getPanZoomViewport(canvasElement);
            const pointer = getCanvasPoint(canvasElement, event.clientX, event.clientY);
            try {
                canvasElement.setPointerCapture(event.pointerId);
            } catch {
                // ignore
            }
            event.preventDefault();
            panDragRef.current = { pointerId: event.pointerId, last: pointer };
        },
        [scene.supportsPanZoom, getPanZoomViewport, getCanvasPoint, canvasRef],
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!scene.supportsPanZoom) {
                return;
            }
            const dragState = panDragRef.current;
            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }
            const canvasElement = canvasRef.current ?? event.currentTarget;
            if (!canvasElement) {
                return;
            }
            const pointer = getCanvasPoint(canvasElement, event.clientX, event.clientY);
            const deltaX = pointer.x - dragState.last.x;
            const deltaY = pointer.y - dragState.last.y;
            if (deltaX === 0 && deltaY === 0) {
                return;
            }
            event.preventDefault();
            const currentModifier = panZoomModifierRef.current;
            const modifierOverride: ViewportModifier = {
                scale: currentModifier.scale,
                offsetX: currentModifier.offsetX + deltaX,
                offsetY: currentModifier.offsetY - deltaY,
            };
            panCanvasBy(deltaX, -deltaY);
            panDragRef.current = { pointerId: dragState.pointerId, last: pointer };
            renderHyperbolicScene(modifierOverride);
        },
        [
            scene.supportsPanZoom,
            getCanvasPoint,
            panZoomModifierRef,
            panCanvasBy,
            renderHyperbolicScene,
            canvasRef,
        ],
    );

    const handlePointerUp = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const dragState = panDragRef.current;
            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
            panDragRef.current = null;
            renderHyperbolicScene();
        },
        [renderHyperbolicScene],
    );

    const handleWheel = useCallback(
        (event: React.WheelEvent<HTMLDivElement>) => {
            if (!scene.supportsPanZoom) {
                return;
            }
            const canvasElement = canvasRef.current;
            if (!canvasElement) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.nativeEvent.stopImmediatePropagation === "function") {
                event.nativeEvent.stopImmediatePropagation();
            }
            const currentViewport = getPanZoomViewport(canvasElement);
            const focus = getCanvasPoint(canvasElement, event.clientX, event.clientY);
            const factor = Math.exp(-event.deltaY * 0.001);
            if (!Number.isFinite(factor) || factor === 1) {
                return;
            }
            const currentModifier = panZoomModifierRef.current;
            const unclampedScale = currentModifier.scale * factor;
            const nextScale = Math.min(
                panZoomLimits.maxScale,
                Math.max(panZoomLimits.minScale, unclampedScale),
            );
            const appliedFactor = nextScale / currentModifier.scale;
            if (!Number.isFinite(appliedFactor) || appliedFactor === 1) {
                return;
            }
            const nextTx = focus.x - (focus.x - currentViewport.tx) * appliedFactor;
            const nextTy = focus.y + (currentViewport.ty - focus.y) * appliedFactor;
            const baseViewport = computeBaseViewport(canvasElement);
            const modifierOverride: ViewportModifier = {
                scale: nextScale,
                offsetX: nextTx - baseViewport.tx,
                offsetY: nextTy - baseViewport.ty,
            };
            zoomCanvasAt(focus, appliedFactor);
            renderHyperbolicScene(modifierOverride);
        },
        [
            scene.supportsPanZoom,
            getPanZoomViewport,
            getCanvasPoint,
            panZoomModifierRef,
            panZoomLimits,
            computeBaseViewport,
            zoomCanvasAt,
            renderHyperbolicScene,
            canvasRef,
        ],
    );

    const defaultControls: ReactNode = (
        <>
            <ModeControls
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSceneChange={onSceneChange}
                renderBackend={renderMode}
            />
            <TexturePicker
                slot={TEXTURE_SLOTS.base}
                state={textureInput.slots[TEXTURE_SLOTS.base]}
                presets={textureInput.presets}
                onSelectFile={(file) => textureInput.loadFile(TEXTURE_SLOTS.base, file)}
                onSelectPreset={(id) => textureInput.loadPreset(TEXTURE_SLOTS.base, id)}
                onClear={() => textureInput.disable(TEXTURE_SLOTS.base)}
            />
        </>
    );

    const baseControlsExtras = useMemo<SceneContextExtras>(
        () => ({
            triangle,
            textureInput,
            triangleSliderId,
        }),
        [triangle, textureInput, triangleSliderId],
    );

    const controlsExtras = useMemo<SceneContextExtras>(() => {
        if (!binding?.controlsExtras) {
            return baseControlsExtras;
        }
        return { ...baseControlsExtras, ...binding.controlsExtras };
    }, [baseControlsExtras, binding?.controlsExtras]);

    const controls = resolveSceneControls({
        scene,
        renderBackend: renderMode,
        defaultControls,
        extras: controlsExtras,
    });

    const baseOverlayExtras = useMemo<SceneContextExtras>(
        () => ({
            triangle,
            triangleSliderId,
        }),
        [triangle, triangleSliderId],
    );

    const overlayExtras = useMemo<SceneContextExtras>(() => {
        if (!binding?.overlayExtras) {
            return baseOverlayExtras;
        }
        return { ...baseOverlayExtras, ...binding.overlayExtras };
    }, [baseOverlayExtras, binding?.overlayExtras]);

    const defaultOverlay = useMemo(
        () =>
            createDefaultEmbedOverlay({
                scene,
            }),
        [scene],
    );

    const overlay = useMemo(
        () =>
            resolveSceneEmbedOverlay({
                scene,
                renderBackend: renderMode,
                defaultOverlay,
                extras: overlayExtras,
            }),
        [scene, renderMode, defaultOverlay, overlayExtras],
    );

    const canvasNode = (
        <StageCanvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
                ...STAGE_CANVAS_BASE_STYLE,
                cursor: scene.supportsPanZoom
                    ? "grab"
                    : (STAGE_CANVAS_BASE_STYLE.cursor ?? "default"),
            }}
        />
    );

    return (
        <SceneLayout
            controls={controls}
            canvas={canvasNode}
            embed={embed}
            overlay={overlay}
            onCanvasWheelCapture={scene.supportsPanZoom ? handleWheel : undefined}
        />
    );
}
