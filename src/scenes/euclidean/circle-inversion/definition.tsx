import type { ReactNode } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import type { CircleInversionSceneConfig } from "@/ui/scenes/circleInversionConfig";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_CIRCLE_INVERSION_SCENE_KEY = "euclideanCircleInversion" as const;

const CIRCLE_INVERSION_LINE_HALF_PLANE = [
    normalizeHalfPlane({ anchor: { x: -0.6, y: 0 }, normal: { x: 0, y: 1 } }),
] as const;

const CIRCLE_INVERSION_LINE_CONTROL_POINTS: HalfPlaneControlPoints[] = [
    [
        { id: "circle-line-start", x: -0.6, y: 0, fixed: false },
        { id: "circle-line-end", x: 0.6, y: 0.2, fixed: false },
    ],
];

const CIRCLE_INVERSION_CONFIG: CircleInversionSceneConfig = {
    fixedCircle: {
        center: { x: 0, y: 0 },
        radius: 0.6,
    },
    line: {
        start: { x: -0.6, y: 0 },
        end: { x: 0.6, y: 0.2 },
    },
    rectangle: {
        center: { x: 0.3, y: 0 },
        halfExtents: { x: 0.15, y: 0.1 },
        rotation: 0,
    },
    secondaryRectangle: {
        center: { x: -0.25, y: 0.15 },
        halfExtents: { x: 0.12, y: 0.08 },
        rotation: 0,
    },
    display: {
        showReferenceLine: true,
        showInvertedLine: true,
        showReferenceRectangle: true,
        showInvertedRectangle: true,
        textureEnabled: true,
        showSecondaryRectangle: true,
        showSecondaryInvertedRectangle: true,
    },
    textureAspect: null,
};

function cloneHalfPlanes(
    planes: readonly { anchor: { x: number; y: number }; normal: { x: number; y: number } }[],
): HalfPlane[] {
    return planes.map((plane) =>
        normalizeHalfPlane({
            anchor: { x: plane.anchor.x, y: plane.anchor.y },
            normal: { x: plane.normal.x, y: plane.normal.y },
        }),
    );
}

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

export const euclideanCircleInversionScene = {
    key: EUCLIDEAN_CIRCLE_INVERSION_SCENE_KEY,
    label: "Circle Inversion",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "circle-inversion",
    description: "Inverts a draggable rectangle across a fixed circle using the WebGL pipeline.",
    supportsHandles: true,
    editable: true,
    defaultHandleSpacing: 1.2,
    defaultTexturePresetId: "cat-fish-run",
    initialHalfPlanes: cloneHalfPlanes(CIRCLE_INVERSION_LINE_HALF_PLANE),
    controlAssignments: [
        { planeIndex: 0, pointIndex: 0, id: "circle-line-start" },
        { planeIndex: 0, pointIndex: 1, id: "circle-line-end" },
    ],
    initialControlPoints: cloneControlPointsList(CIRCLE_INVERSION_LINE_CONTROL_POINTS),
    inversionConfig: CIRCLE_INVERSION_CONFIG,
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
