import type { Geodesic } from "./geodesic";
import { invertInCircle } from "./inversion";
import type { Vec2 } from "./types";

export type Transform2D = (p: Vec2) => Vec2;

function reflectAcrossDiameter(dirIn: Vec2): Transform2D {
    // Ensure unit direction
    const n = Math.hypot(dirIn.x, dirIn.y) || 1;
    const u = { x: dirIn.x / n, y: dirIn.y / n };
    // R(p) = (2 uu^T - I) p
    return (p: Vec2): Vec2 => {
        const dot = u.x * p.x + u.y * p.y;
        return { x: 2 * dot * u.x - p.x, y: 2 * dot * u.y - p.y };
    };
}

export function reflectAcrossGeodesic(g: Geodesic): Transform2D {
    if (g.kind === "diameter") {
        return reflectAcrossDiameter(g.dir);
    }
    // circle geodesic: Euclidean inversion in the orthogonal circle
    return (p: Vec2): Vec2 => invertInCircle(p, { c: g.c, r: g.r });
}
