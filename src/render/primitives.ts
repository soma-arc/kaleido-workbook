import type { Geodesic } from "../geom/geodesic";
import type { Viewport } from "./viewport";
import { worldToScreen } from "./viewport";

export type CircleSpec = { cx: number; cy: number; r: number };
export type LineSpec = { x1: number; y1: number; x2: number; y2: number };

export function unitDiskSpec(vp: Viewport): CircleSpec {
    const c = worldToScreen(vp, { x: 0, y: 0 });
    const r = Math.abs(vp.scale || 1) * 1;
    return { cx: c.x, cy: c.y, r };
}

export function geodesicSpec(geo: Geodesic, vp: Viewport): CircleSpec | LineSpec {
    if (geo.kind === "circle") {
        const c = worldToScreen(vp, geo.c);
        const r = Math.abs(vp.scale || 1) * geo.r;
        return { cx: c.x, cy: c.y, r };
    }
    if (geo.kind === "diameter") {
        const a = worldToScreen(vp, { x: -geo.dir.x, y: -geo.dir.y });
        const b = worldToScreen(vp, { x: geo.dir.x, y: geo.dir.y });
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }
    // half-plane: draw intersection of line with unit disk
    const normal = geo.normal;
    const offset = geo.offset;
    const t = normalize({ x: -normal.y, y: normal.x });
    const closest = { x: -offset * normal.x, y: -offset * normal.y };
    const intersections = intersectWithUnitDisk(closest, t);
    const a = worldToScreen(vp, intersections[0]);
    const b = worldToScreen(vp, intersections[1]);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

function normalize(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / len, y: v.y / len };
}

function intersectWithUnitDisk(
    base: { x: number; y: number },
    dir: { x: number; y: number },
): [{ x: number; y: number }, { x: number; y: number }] {
    const dotBT = base.x * dir.x + base.y * dir.y;
    const baseLenSq = base.x * base.x + base.y * base.y;
    const disc = dotBT * dotBT - (baseLenSq - 1);
    if (disc <= 0) {
        const scale = 2;
        return [
            { x: base.x - scale * dir.x, y: base.y - scale * dir.y },
            { x: base.x + scale * dir.x, y: base.y + scale * dir.y },
        ];
    }
    const root = Math.sqrt(disc);
    const lambda1 = -dotBT - root;
    const lambda2 = -dotBT + root;
    return [
        { x: base.x + lambda1 * dir.x, y: base.y + lambda1 * dir.y },
        { x: base.x + lambda2 * dir.x, y: base.y + lambda2 * dir.y },
    ];
}
