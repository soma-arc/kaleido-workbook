import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { Viewport } from "@/render/viewport";
import { screenToWorld } from "@/render/viewport";

export function hitTestHalfPlane(
    plane: HalfPlane,
    viewport: Viewport,
    screen: { x: number; y: number },
    pxTolerance: number = 8,
): boolean {
    const unit = normalizeHalfPlane(plane);
    const p = screenToWorld(viewport, screen);
    const worldDist = Math.abs(unit.normal.x * p.x + unit.normal.y * p.y + unit.offset);
    const pxDist = worldDist * Math.max(1, viewport.scale || 1);
    return pxDist <= pxTolerance;
}

export function pickHalfPlaneIndex(
    planes: HalfPlane[],
    viewport: Viewport,
    screen: { x: number; y: number },
    pxTolerance: number = 8,
): number {
    let best = -1;
    let bestPx = pxTolerance;
    for (let i = 0; i < planes.length; i++) {
        const unit = normalizeHalfPlane(planes[i]);
        const p = screenToWorld(viewport, screen);
        const worldDist = Math.abs(unit.normal.x * p.x + unit.normal.y * p.y + unit.offset);
        const pxDist = worldDist * Math.max(1, viewport.scale || 1);
        if (pxDist <= bestPx) {
            bestPx = pxDist;
            best = i;
        }
    }
    return best;
}

export function nextOffsetOnDrag(
    normal: Vec2, // assumed unit
    startOffset: number,
    viewport: Viewport,
    startScreen: { x: number; y: number },
    curScreen: { x: number; y: number },
): number {
    const p0 = screenToWorld(viewport, startScreen);
    const p1 = screenToWorld(viewport, curScreen);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    return startOffset - (normal.x * dx + normal.y * dy);
}
