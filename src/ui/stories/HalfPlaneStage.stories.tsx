import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import {
    halfPlaneFromNormalAndOffset,
    halfPlaneOffset,
    normalizeHalfPlane,
} from "@/geom/primitives/halfPlane";
import {
    deriveHalfPlaneFromPoints,
    type HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import { createRenderEngine, type RenderEngine } from "@/render/engine";
import type { Viewport } from "@/render/viewport";
import { screenToWorld } from "@/render/viewport";
import { HalfPlaneHandleControls } from "@/ui/components/HalfPlaneHandleControls";
import { StageCanvas } from "@/ui/components/StageCanvas";
import {
    controlPointsFromHalfPlanes,
    hitTestControlPoints,
    updateControlPoint,
} from "@/ui/interactions/halfPlaneControlPoints";

const DEFAULT_PLANES: HalfPlane[] = [
    halfPlaneFromNormalAndOffset({ x: 1, y: 0 }, 0),
    halfPlaneFromNormalAndOffset({ x: 0, y: 1 }, 0),
    halfPlaneFromNormalAndOffset({ x: -Math.SQRT1_2, y: Math.SQRT1_2 }, 0),
].map((plane) => normalizeHalfPlane(plane));

const HANDLE_TOLERANCE_PX = 12;

function computeViewport(canvas: HTMLCanvasElement): Viewport {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 1;
    const height = rect.height || canvas.height || 1;
    const size = Math.min(width, height);
    const margin = 8;
    const scale = Math.max(1, size / 2 - margin);
    return { scale, tx: width / 2, ty: height / 2 };
}

function getPointer(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

type HandleDragState = {
    pointerId: number;
    planeIndex: number;
    pointIndex: 0 | 1;
};

function HalfPlaneStageDemo(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<RenderEngine | null>(null);
    const latestPlanesRef = useRef<HalfPlane[]>(DEFAULT_PLANES);
    const canvasId = useId();
    const [halfPlanes, setHalfPlanes] = useState<HalfPlane[]>(DEFAULT_PLANES);
    const [showHandles, setShowHandles] = useState(true);
    const [handleState, setHandleState] = useState<{
        spacing: number;
        points: HalfPlaneControlPoints[];
    }>(() => ({ spacing: 0.6, points: controlPointsFromHalfPlanes(DEFAULT_PLANES, 0.6) }));
    const [drag, setDrag] = useState<HandleDragState | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = createRenderEngine(canvas, { mode: "canvas" });
        engineRef.current = engine;
        return () => {
            engineRef.current = null;
            engine.dispose();
        };
    }, []);

    const renderScene = useCallback(
        (
            planes: HalfPlane[],
            points: HalfPlaneControlPoints[] | null,
            active: { planeIndex: number; pointIndex: 0 | 1 } | null,
        ) => {
            latestPlanesRef.current = planes;
            const handles =
                showHandles && points
                    ? {
                          visible: true,
                          items: points.map((pts, idx) => ({ planeIndex: idx, points: pts })),
                          active,
                      }
                    : undefined;
            engineRef.current?.render({
                geometry: GEOMETRY_KIND.euclidean,
                halfPlanes: planes,
                handles,
            });
        },
        [showHandles],
    );

    useEffect(() => {
        renderScene(
            halfPlanes,
            showHandles ? handleState.points : null,
            drag ? { planeIndex: drag.planeIndex, pointIndex: drag.pointIndex } : null,
        );
    }, [halfPlanes, handleState, drag, showHandles, renderScene]);

    useEffect(() => {
        if (!showHandles) {
            setDrag(null);
            renderScene(halfPlanes, null, null);
            return;
        }
        setHandleState((prev) => {
            if (prev.points.length !== halfPlanes.length) {
                return {
                    spacing: prev.spacing,
                    points: controlPointsFromHalfPlanes(halfPlanes, prev.spacing),
                };
            }
            return prev;
        });
    }, [halfPlanes, showHandles, renderScene]);

    const handleSpacingChange = (value: number) => {
        setHandleState({ spacing: value, points: controlPointsFromHalfPlanes(halfPlanes, value) });
    };

    const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!showHandles) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const screen = getPointer(e);
        const hit = hitTestControlPoints(handleState.points, viewport, screen, HANDLE_TOLERANCE_PX);
        if (!hit) return;
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            // ignore pointer capture failures in Storybook
        }
        const world = screenToWorld(viewport, screen);
        const nextPoints = updateControlPoint(
            handleState.points,
            hit.planeIndex,
            hit.pointIndex,
            world,
        );
        const nextPlanes = halfPlanes.map((plane, idx) =>
            idx === hit.planeIndex ? deriveHalfPlaneFromPoints(nextPoints[idx]) : plane,
        );
        setHandleState({ spacing: handleState.spacing, points: nextPoints });
        setHalfPlanes(nextPlanes);
        setDrag({ pointerId: e.pointerId, planeIndex: hit.planeIndex, pointIndex: hit.pointIndex });
        renderScene(nextPlanes, nextPoints, hit);
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!drag || !showHandles) return;
        const canvas = e.currentTarget;
        const viewport = computeViewport(canvas);
        const world = screenToWorld(viewport, getPointer(e));
        let nextPoints: HalfPlaneControlPoints[] | null = null;
        setHandleState((prev) => {
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
        const confirmedPoints = nextPoints;
        const nextPlanes = halfPlanes.map((plane, idx) =>
            idx === drag.planeIndex ? deriveHalfPlaneFromPoints(confirmedPoints[idx]) : plane,
        );
        setHalfPlanes(nextPlanes);
        renderScene(nextPlanes, nextPoints, {
            planeIndex: drag.planeIndex,
            pointIndex: drag.pointIndex,
        });
    };

    const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
        if (drag) {
            try {
                e.currentTarget.releasePointerCapture(drag.pointerId);
            } catch {
                // ignore
            }
        }
        setDrag(null);
        renderScene(latestPlanesRef.current, showHandles ? handleState.points : null, null);
    };

    const offsetDisplay = useMemo(
        () => (halfPlanes[0] ? halfPlaneOffset(halfPlanes[0]) : 0),
        [halfPlanes],
    );

    return (
        <div style={{ display: "grid", gap: "12px", width: "fit-content" }}>
            <HalfPlaneHandleControls
                showHandles={showHandles}
                onToggle={setShowHandles}
                spacing={handleState.spacing}
                onSpacingChange={handleSpacingChange}
            />
            <StageCanvas
                id={canvasId}
                data-testid="story-stage-canvas"
                ref={canvasRef}
                width={480}
                height={360}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: "none" }}
            />
            <div>
                <span>Primary half-plane offset:</span>
                <output
                    data-testid="half-plane-offset"
                    style={{ display: "inline-block", minWidth: "4ch", marginLeft: "8px" }}
                >
                    {offsetDisplay.toFixed(4)}
                </output>
            </div>
        </div>
    );
}

const meta: Meta<typeof HalfPlaneStageDemo> = {
    title: "UI/HalfPlaneStage",
    component: HalfPlaneStageDemo,
    parameters: {
        layout: "centered",
    },
};

export default meta;

type Story = StoryObj<typeof HalfPlaneStageDemo>;

export const HandlesInteractive: Story = {
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement).getByTestId("story-stage-canvas") as HTMLCanvasElement;
        const offsetEl = within(canvasElement).getByTestId("half-plane-offset");
        const initialOffset = Number.parseFloat(offsetEl.textContent ?? "0");

        await userEvent.pointer([
            { target: canvas, coords: { x: 240, y: 285 }, keys: "[MouseLeft]" },
            { target: canvas, coords: { x: 310, y: 285 } },
            { target: canvas, coords: { x: 310, y: 285 }, keys: "[/MouseLeft]" },
        ]);

        await waitFor(() => {
            const nextOffset = Number.parseFloat(offsetEl.textContent ?? "0");
            expect(nextOffset).not.toBeNaN();
            expect(Math.abs(nextOffset - initialOffset)).toBeGreaterThan(0.001);
        });
    },
};
