import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import { EUCLIDEAN_HALF_PLANE_PIPELINE_ID } from "@/render/webgl/pipelines/pipelineIds";
import type { SceneDefinitionInput } from "@/ui/scenes/types";
import type { HingePlaneAngles } from "./math";
import { HingeAnglesOverlay } from "./ui/Overlay";

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
    supportsPanZoom: false,
    allowPlaneDrag: false,
    defaultTexturePresetId: "cat-fish-run",
    embedOverlayDefaultVisible: true,
    embedOverlayFactory: ({ extras }) => {
        const context = (extras as { hingeOverlay?: HingePlaneAngles }) ?? {};
        return <HingeAnglesOverlay data={context.hingeOverlay} />;
    },
    initialHalfPlanes: HINGE_HALF_PLANES.map((plane) => normalizeHalfPlane(plane)),
    textureRectangle: {
        enabled: true,
        center: { x: 0, y: -0.5 },
        halfExtents: { x: 0.2, y: 0.2 },
        rotation: 0,
    },
    renderPipelineId: EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    controlAssignments: [
        { planeIndex: 0, pointIndex: 0, id: "hinge", fixed: true },
        { planeIndex: 1, pointIndex: 1, id: "hinge", fixed: true },
    ],
    initialControlPoints: cloneControlPointsList(HINGE_INITIAL_CONTROL_POINTS),
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
