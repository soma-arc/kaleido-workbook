import type { Geodesic } from "../geom/geodesic";
import type { Viewport } from "./viewport";
import { worldToScreen } from "./viewport";

export type CircleSpec = { cx: number; cy: number; r: number };
export type LineSpec = { x1: number; y1: number; x2: number; y2: number };

// (Issue #79) Intentionally minimal; triangle path segment specs live in trianglePath.ts

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
    // diameter through origin in direction dir (unit), draw as a line through screen center
    const a = worldToScreen(vp, { x: -geo.dir.x, y: -geo.dir.y });
    const b = worldToScreen(vp, { x: geo.dir.x, y: geo.dir.y });
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
