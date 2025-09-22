import type { Vec2 } from "@/geom/core/types";
import type { Geodesic } from "@/geom/primitives/geodesic";

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

function unit(v: Vec2): Vec2 {
    const n = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / n, y: v.y / n };
}

function angleBetweenDirections(u: Vec2, v: Vec2): number {
    const du = unit(u);
    const dv = unit(v);
    const d = clamp(Math.abs(du.x * dv.x + du.y * dv.y), 0, 1);
    return Math.acos(d);
}

export function angleBetweenGeodesicsAt(a: Geodesic, b: Geodesic, at?: Vec2): number {
    let p: Vec2;
    if (a.kind === "halfPlane" || b.kind === "halfPlane") {
        throw new Error("Half-plane geodesics are not supported in hyperbolic angle evaluation");
    }
    if (at) {
        p = at;
    } else if (a.kind === "diameter" && b.kind === "diameter") {
        p = { x: 0, y: 0 };
    } else if (a.kind === "diameter" && b.kind === "circle") {
        const u = a.dir;
        const cdotu = b.c.x * u.x + b.c.y * u.y;
        const cc = b.c.x * b.c.x + b.c.y * b.c.y;
        const disc = cdotu * cdotu - (cc - b.r * b.r);
        const s = cdotu - Math.sqrt(Math.max(0, disc));
        p = { x: s * u.x, y: s * u.y };
    } else if (a.kind === "circle" && b.kind === "diameter") {
        const u = b.dir;
        const cdotu = a.c.x * u.x + a.c.y * u.y;
        const cc = a.c.x * a.c.x + a.c.y * a.c.y;
        const disc = cdotu * cdotu - (cc - a.r * a.r);
        const s = cdotu - Math.sqrt(Math.max(0, disc));
        p = { x: s * u.x, y: s * u.y };
    } else if (a.kind === "circle" && b.kind === "circle") {
        p = { x: (a.c.x + b.c.x) / 2, y: (a.c.y + b.c.y) / 2 };
    } else {
        p = { x: 0, y: 0 };
    }
    const dirA =
        a.kind === "diameter"
            ? a.dir
            : {
                  x: p.y - a.c.y,
                  y: -(p.x - a.c.x),
              };
    const dirB =
        b.kind === "diameter"
            ? b.dir
            : {
                  x: p.y - b.c.y,
                  y: -(p.x - b.c.x),
              };
    return angleBetweenDirections(dirA, dirB);
}
