import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import type { SceneDefinitionInput } from "@/ui/scenes/types";

export const EUCLIDEAN_HINGE_SCENE_KEY = "euclideanHinge" as const;

const HINGE_HALF_PLANES = [
    normalizeHalfPlane({ anchor: { x: 0, y: 0 }, normal: { x: -1, y: 0 } }),
    normalizeHalfPlane({ anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } }),
] as const;

const HINGE_INITIAL_CONTROL_POINTS: HalfPlaneControlPoints[] = [
    [
        { id: "hinge", x: 0, y: 0, fixed: true },
        { id: "hinge-plane-0-free", x: 0, y: 0.6, fixed: false },
    ],
    [
        { id: "hinge-plane-1-free", x: -0.8, y: 0, fixed: false },
        { id: "hinge", x: 0, y: 0, fixed: true },
    ],
];

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

export const euclideanHingeScene = {
    key: EUCLIDEAN_HINGE_SCENE_KEY,
    label: "Hinge Mirrors",
    geometry: GEOMETRY_KIND.euclidean,
    variant: "hinge",
    description: "Two mirrors share a fixed hinge; drag the free endpoints to rotate them.",
    supportsHandles: true,
    editable: true,
    allowPlaneDrag: false,
    initialHalfPlanes: HINGE_HALF_PLANES.map((plane) => normalizeHalfPlane(plane)),
    controlAssignments: [
        { planeIndex: 0, pointIndex: 0, id: "hinge", fixed: true },
        { planeIndex: 1, pointIndex: 1, id: "hinge", fixed: true },
    ],
    initialControlPoints: cloneControlPointsList(HINGE_INITIAL_CONTROL_POINTS),
} satisfies SceneDefinitionInput;
