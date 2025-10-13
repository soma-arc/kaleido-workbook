import type { Vec2 } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { GEODESIC_KIND, geodesicFromBoundary } from "@/geom/primitives/geodesic";
import { evaluateHalfPlane, type HalfPlane, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { OrientedGeodesic } from "@/geom/primitives/orientedGeodesic";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import { solveThirdMirror, unitDirection } from "@/geom/triangle/thirdMirror";
import type { HyperbolicTrianglePrimitives } from "@/geom/triangle/types";

const SUM_TOL = 1e-6;

function buildDiameterHalfPlaneFromDir(dir: Vec2, interiorPoint: Vec2): HalfPlane {
    const length = Math.hypot(dir.x, dir.y) || 1;
    const unitDir = { x: dir.x / length, y: dir.y / length };
    const plane = normalizeHalfPlane({
        anchor: { x: 0, y: 0 },
        normal: { x: -unitDir.y, y: unitDir.x },
    });
    if (evaluateHalfPlane(plane, interiorPoint) > 0) {
        return plane;
    }
    return normalizeHalfPlane({
        anchor: { x: plane.anchor.x, y: plane.anchor.y },
        normal: { x: -plane.normal.x, y: -plane.normal.y },
    });
}

function orientedLineFromHalfPlane(plane: HalfPlane): OrientedGeodesic {
    const chosen = normalizeHalfPlane(plane);
    return {
        kind: "line",
        anchor: { x: chosen.anchor.x, y: chosen.anchor.y },
        normal: { x: chosen.normal.x, y: chosen.normal.y },
    };
}

function orientedCircleFromCircleGeodesic(
    center: Vec2,
    radius: number,
    interior: Vec2,
): OrientedGeodesic {
    const dx = interior.x - center.x;
    const dy = interior.y - center.y;
    const distance = Math.hypot(dx, dy);
    const orientation: 1 | -1 = distance - radius <= 0 ? 1 : -1;
    return {
        kind: "circle",
        center: { x: center.x, y: center.y },
        radius,
        orientation,
    };
}

function buildEuclideanFallback(p: number, q: number, r: number): HyperbolicTrianglePrimitives {
    const euclidean = buildEuclideanTriangle(p, q, r);
    const orientedBoundaries = euclidean.boundaries.map((plane) =>
        orientedLineFromHalfPlane(plane),
    ) as [OrientedGeodesic, OrientedGeodesic, OrientedGeodesic];
    return {
        kind: GEOMETRY_KIND.hyperbolic,
        boundaries: orientedBoundaries,
        vertices: euclidean.vertices,
        angles: euclidean.angles,
    };
}

/**
 * buildHyperbolicTriangle
 * Construct a canonical (p,q,r) hyperbolic triangle primitive set.
 */
export function buildHyperbolicTriangle(
    p: number,
    q: number,
    r: number,
): HyperbolicTrianglePrimitives {
    if (!(p > 1 && q > 1 && r > 1)) {
        throw new Error("Invalid (p,q,r) for hyperbolic triangle");
    }
    const hyperbolicConstraint = 1 / p + 1 / q + 1 / r;
    if (Math.abs(hyperbolicConstraint - 1) <= SUM_TOL) {
        return buildEuclideanFallback(p, q, r);
    }
    if (hyperbolicConstraint > 1 + SUM_TOL) {
        throw new Error(
            `[HyperbolicTriangle] (p,q,r)=(${p},${q},${r}) violates hyperbolic constraint (1/p + 1/q + 1/r >= 1)`,
        );
    }
    const alpha = Math.PI / p;
    const beta = Math.PI / q;
    const gamma = Math.PI / r;

    // g1, g2: diameters crossing at origin with angle alpha
    const aDir = unitDirection(alpha);
    const g2 = geodesicFromBoundary(aDir, { x: -aDir.x, y: -aDir.y });

    const third = solveThirdMirror(alpha, beta, gamma);

    // vertices: v0 = origin (g1∩g2), v1 = g1∩g3 on x-axis, v2 = g2∩g3 on line alpha
    const v0: Vec2 = { x: 0, y: 0 };
    const cx = third.c.x;
    const cy = third.c.y;
    const rad = third.r;
    const dx = Math.sqrt(Math.max(0, rad * rad - cy * cy));
    const cand1 = cx - dx;
    const cand2 = cx + dx;
    const pick = (x: number) => (x > 0 && x < 1 ? x : NaN);
    let x1 = Number.isFinite(pick(cand1)) ? cand1 : cand2;
    if (!(x1 > 0 && x1 < 1)) x1 = Math.max(1e-6, Math.min(0.999, cand1));
    const v1: Vec2 = { x: x1, y: 0 };

    const cdotu = cx * aDir.x + cy * aDir.y;
    const disc = cdotu * cdotu - (cx * cx + cy * cy - rad * rad);
    const root = Math.sqrt(Math.max(0, disc));
    const s = cdotu - root;
    const v2: Vec2 = { x: s * aDir.x, y: s * aDir.y };

    const interior: Vec2 = {
        x: (v0.x + v1.x + v2.x) / 3,
        y: (v0.y + v1.y + v2.y) / 3,
    };

    const lineBoundary1 = orientedLineFromHalfPlane(
        buildDiameterHalfPlaneFromDir({ x: 1, y: 0 }, interior),
    );
    const lineBoundary2 =
        g2.kind === GEODESIC_KIND.diameter
            ? orientedLineFromHalfPlane(buildDiameterHalfPlaneFromDir(g2.dir, interior))
            : orientedLineFromHalfPlane(buildDiameterHalfPlaneFromDir({ x: -1, y: 0 }, interior));
    const circleBoundary = orientedCircleFromCircleGeodesic(third.c, third.r, interior);
    return {
        kind: GEOMETRY_KIND.hyperbolic,
        boundaries: [lineBoundary1, lineBoundary2, circleBoundary],
        vertices: [v0, v1, v2],
        angles: [alpha, beta, gamma],
    };
}

/** @deprecated Prefer buildHyperbolicTriangle */
export const buildFundamentalTriangle = buildHyperbolicTriangle;
