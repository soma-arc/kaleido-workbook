import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import {
    deriveHalfPlaneFromPoints,
    derivePointsFromHalfPlane,
} from "@/geom/primitives/halfPlaneControls";
import type { Viewport } from "@/render/viewport";
import { worldToScreen } from "@/render/viewport";

export function controlPointsFromHalfPlanes(
    planes: HalfPlane[],
    spacing: number,
): HalfPlaneControlPoints[] {
    return planes.map((plane) => derivePointsFromHalfPlane(plane, spacing));
}

export function halfPlanesFromControlPoints(controls: HalfPlaneControlPoints[]): HalfPlane[] {
    return controls.map((points) => deriveHalfPlaneFromPoints(points));
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
    const next = controls.map((points) => [...points] as HalfPlaneControlPoints);
    next[planeIndex][pointIndex] = worldPoint;
    return next;
}
