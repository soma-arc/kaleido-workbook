import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPoint,
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import { deriveHalfPlaneFromPoints } from "@/geom/primitives/halfPlaneControls";

/**
 * Static configuration needed to bootstrap a regular polygon scene.
 */
export interface RegularPolygonSceneConfig {
    halfPlanes: HalfPlane[];
    initialControlPoints: HalfPlaneControlPoints[];
    controlAssignments: ControlPointAssignment[];
    defaultHandleSpacing: number;
}

/**
 * Options for generating a regular polygon centred at the origin.
 */
export interface RegularPolygonParams {
    sides: number;
    radius: number;
    initialAngle?: number;
}

function cloneControlPoint(point: ControlPoint): ControlPoint {
    return { id: point.id, x: point.x, y: point.y, fixed: point.fixed };
}

/**
 * Creates half-planes, control points, and shared control assignments for a regular polygon scene.
 *
 * @param params - Shape parameters for the polygon.
 */
export function createRegularPolygonSceneConfig({
    sides,
    radius,
    initialAngle = 0,
}: RegularPolygonParams): RegularPolygonSceneConfig {
    if (!Number.isFinite(sides) || sides < 3) {
        throw new Error("Regular polygon requires at least 3 sides");
    }
    if (!(radius > 0)) {
        throw new Error("Regular polygon radius must be positive");
    }

    const angleStep = (Math.PI * 2) / sides;
    const vertices: ControlPoint[] = Array.from({ length: sides }, (_, idx) => {
        const angle = initialAngle + angleStep * idx;
        return {
            id: `vertex-${idx}`,
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
            fixed: false,
        } satisfies ControlPoint;
    });

    const halfPlanes: HalfPlane[] = [];
    const controlAssignments: ControlPointAssignment[] = [];
    const initialControlPoints: HalfPlaneControlPoints[] = [];

    let defaultHandleSpacing = 0;

    for (let i = 0; i < sides; i++) {
        const nextIndex = (i + 1) % sides;
        const currentVertex = vertices[i];
        const nextVertex = vertices[nextIndex];

        const plane = deriveHalfPlaneFromPoints([
            { x: currentVertex.x, y: currentVertex.y },
            { x: nextVertex.x, y: nextVertex.y },
        ]);
        halfPlanes.push(plane);

        initialControlPoints.push([
            cloneControlPoint(currentVertex),
            cloneControlPoint(nextVertex),
        ]);

        controlAssignments.push({ planeIndex: i, pointIndex: 0, id: currentVertex.id });
        controlAssignments.push({ planeIndex: i, pointIndex: 1, id: nextVertex.id });

        if (i === 0) {
            defaultHandleSpacing = Math.hypot(
                nextVertex.x - currentVertex.x,
                nextVertex.y - currentVertex.y,
            );
        }
    }

    return {
        halfPlanes,
        initialControlPoints,
        controlAssignments,
        defaultHandleSpacing,
    };
}
