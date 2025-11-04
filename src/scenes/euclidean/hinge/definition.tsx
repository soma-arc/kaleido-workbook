import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import { SHAPE_CIRCLE, SHAPE_SQUARE } from "@/render/webgl/controlPointUniforms";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_HINGE_SCENE_KEY = "euclideanHinge" as const;

const HINGE_HALF_PLANES = [
    normalizeHalfPlane({ anchor: { x: 0, y: 0 }, normal: { x: -1, y: 0 } }),
    normalizeHalfPlane({ anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } }),
] as const;

const HINGE_INITIAL_CONTROL_POINTS: HalfPlaneControlPoints[] = [
    [
        { id: "hinge", x: 0, y: 0, fixed: true },
        { id: "hinge-plane-0-free", x: 1 / Math.sqrt(2), y: -1 / Math.sqrt(2), fixed: false },
    ],
    [
        { id: "hinge-plane-1-free", x: -1 / Math.sqrt(2), y: -1 / Math.sqrt(2), fixed: false },
        { id: "hinge", x: 0, y: 0, fixed: true },
    ],
];

function cloneControlPointsList(
    controlPoints: readonly [
        { id: string; x: number; y: number; fixed: boolean },
        { id: string; x: number; y: number; fixed: boolean },
    ][],
): HalfPlaneControlPoints[] {
    return controlPoints.map((pair) => [
        { id: pair[0].id, x: pair[0].x, y: pair[0].y, fixed: pair[0].fixed },
        { id: pair[1].id, x: pair[1].x, y: pair[1].y, fixed: pair[1].fixed },
    ]);
}

export const euclideanHingeScene = {
    key: EUCLIDEAN_HINGE_SCENE_KEY,
    label: "Hinge Mirrors",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "hinge",
    description: "Two mirrors share a fixed hinge; drag the free endpoints to rotate them.",
    supportsHandles: true,
    editable: true,
    supportsPanZoom: true,
    allowPlaneDrag: false,
    defaultTexturePresetId: "cat-fish-run",
    embedOverlayDefaultVisible: false,
    initialHalfPlanes: HINGE_HALF_PLANES.map((plane) => normalizeHalfPlane(plane)),
    textureRectangle: {
        enabled: true,
        center: { x: 0, y: -0.5 },
        halfExtents: { x: 0.3, y: 0.3 },
        rotation: 0,
    },
    renderPipelineId: EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    controlAssignments: [
        { planeIndex: 0, pointIndex: 0, id: "hinge", fixed: true },
        { planeIndex: 1, pointIndex: 1, id: "hinge", fixed: true },
    ],
    initialControlPoints: cloneControlPointsList(HINGE_INITIAL_CONTROL_POINTS),
    renderControlPoints: [
        // Hinge point (fixed, red circle)
        {
            position: { x: 0, y: 0 },
            radiusPx: 8,
            fillColor: { r: 0.9, g: 0.2, b: 0.2, a: 0.8 },
            strokeColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
            strokeWidthPx: 2,
            shape: SHAPE_CIRCLE,
        },
        // Free point 1 (blue square)
        {
            position: { x: 1 / Math.sqrt(2), y: -1 / Math.sqrt(2) },
            radiusPx: 8,
            fillColor: { r: 0.2, g: 0.4, b: 0.9, a: 0.8 },
            strokeColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
            strokeWidthPx: 2,
            shape: SHAPE_SQUARE,
        },
        // Free point 2 (green square)
        {
            position: { x: -1 / Math.sqrt(2), y: -1 / Math.sqrt(2) },
            radiusPx: 8,
            fillColor: { r: 0.2, g: 0.9, b: 0.4, a: 0.8 },
            strokeColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
            strokeWidthPx: 2,
            shape: SHAPE_SQUARE,
        },
    ],
    controlsFactory: ({ defaultControls, extras }) => {
        const context = extras as {
            presetControls?: ReactNode;
            triangleControls?: ReactNode;
            handleControls?: ReactNode;
            circleInversionControls?: ReactNode;
            cameraDebugControls?: ReactNode;
        };
        return (
            <>
                {defaultControls}
                {context.presetControls}
                {context.triangleControls}
                {context.handleControls}
                {context.circleInversionControls}
                {context.cameraDebugControls}
            </>
        );
    },
} satisfies SceneDefinitionInput;
