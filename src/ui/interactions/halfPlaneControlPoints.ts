import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type {
    ControlPointAssignment,
    HalfPlaneControlPoints,
} from "@/geom/primitives/halfPlaneControls";
import {
    controlPointsFromHalfPlanes as buildControlPoints,
    deriveHalfPlaneFromPoints,
} from "@/geom/primitives/halfPlaneControls";
import type { Viewport } from "@/render/viewport";
import { worldToScreen } from "@/render/viewport";

export function controlPointsFromHalfPlanes(
    planes: HalfPlane[],
    spacing: number,
    assignments?: ControlPointAssignment[],
): HalfPlaneControlPoints[] {
    return buildControlPoints(planes, spacing, assignments);
}

export function halfPlanesFromControlPoints(controls: HalfPlaneControlPoints[]): HalfPlane[] {
    return controls.map((points) =>
        deriveHalfPlaneFromPoints([
            { x: points[0].x, y: points[0].y },
            { x: points[1].x, y: points[1].y },
        ]),
    );
}

export function hitTestControlPoints(
    controls: HalfPlaneControlPoints[],
    viewport: Viewport,
    screen: { x: number; y: number },
    pxTolerance: number,
): { planeIndex: number; pointIndex: 0 | 1 } | null {
    const tolerance = Math.max(0, pxTolerance);
    let bestPlane = -1;
    let bestPoint = -1;
    let bestDist = tolerance;
    for (let planeIndex = 0; planeIndex < controls.length; planeIndex++) {
        const points = controls[planeIndex];
        for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
            const projected = worldToScreen(viewport, points[pointIndex]);
            const dx = projected.x - screen.x;
            const dy = projected.y - screen.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= bestDist) {
                bestDist = dist;
                bestPlane = planeIndex;
                bestPoint = pointIndex;
            }
        }
    }
    if (bestPlane < 0 || bestPoint < 0) return null;
    return { planeIndex: bestPlane, pointIndex: bestPoint === 0 ? 0 : 1 };
}

export function updateControlPoint(
    controls: HalfPlaneControlPoints[],
    planeIndex: number,
    pointIndex: 0 | 1,
    worldPoint: Vec2,
): HalfPlaneControlPoints[] {
    const targetPlane = controls[planeIndex];
    if (!targetPlane) return controls;
    const target = targetPlane[pointIndex];
    if (!target || target.fixed) {
        return controls;
    }

    let changed = false;
    const next = controls.map((points) => {
        const nextPoints: HalfPlaneControlPoints = [...points] as HalfPlaneControlPoints;
        for (let i = 0; i < nextPoints.length; i++) {
            const point = nextPoints[i];
            if (point.id !== target.id || point.fixed) continue;
            if (point.x === worldPoint.x && point.y === worldPoint.y) continue;
            nextPoints[i] = { ...point, x: worldPoint.x, y: worldPoint.y };
            changed = true;
        }
        return nextPoints;
    });

    return changed ? next : controls;
}
