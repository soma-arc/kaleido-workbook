import type { Vec2 } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { EuclideanTrianglePrimitives } from "@/geom/triangle/types";

export type EuclideanTriangle = EuclideanTrianglePrimitives;

const SUM_TOL = 1e-6;

export function buildEuclideanTriangle(p: number, q: number, r: number): EuclideanTriangle {
    if (!(p > 1 && q > 1 && r > 1)) {
        throw new Error("(p,q,r) must all exceed 1 for Euclidean mode");
    }
    const alpha = Math.PI / p;
    const beta = Math.PI / q;
    const gamma = Math.PI / r;
    const angleSum = alpha + beta + gamma;
    if (Math.abs(angleSum - Math.PI) > SUM_TOL) {
        throw new Error("Angles do not form a Euclidean triangle (π sum constraint)");
    }

    // Law of sines with c (between v0 and v1) normalized to 1
    const sinGamma = Math.sin(gamma);
    if (!(sinGamma > 0)) {
        throw new Error("Invalid (p,q,r): degenerate Euclidean triangle");
    }
    const b = Math.sin(beta) / sinGamma; // length AC

    const v0: Vec2 = { x: 0, y: 0 };
    const v1: Vec2 = { x: 1, y: 0 };
    const v2: Vec2 = { x: b * Math.cos(alpha), y: b * Math.sin(alpha) };

    const center: Vec2 = {
        x: (v0.x + v1.x + v2.x) / 3,
        y: (v0.y + v1.y + v2.y) / 3,
    };

    const mirrors: [HalfPlane, HalfPlane, HalfPlane] = [
        createMirror(v1, v2, center),
        createMirror(v0, v2, center),
        createMirror(v0, v1, center),
    ];

    return {
        kind: GEOMETRY_KIND.euclidean,
        mirrors,
        vertices: [v0, v1, v2],
        angles: [alpha, beta, gamma],
    };
}

function createMirror(a: Vec2, b: Vec2, interior: Vec2): HalfPlane {
    const dir = { x: b.x - a.x, y: b.y - a.y };
    const normal = { x: dir.y, y: -dir.x };
    const plane = normalizeHalfPlane({
        normal,
        offset: -(normal.x * a.x + normal.y * a.y),
    });
    const value = plane.normal.x * interior.x + plane.normal.y * interior.y + plane.offset;
    if (value < 0) {
        return plane;
    }
    return {
        normal: { x: -plane.normal.x, y: -plane.normal.y },
        offset: -plane.offset,
    };
}
