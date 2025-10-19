import type { Vec2 } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { evaluateHalfPlane, type HalfPlane, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { OrientedGeodesic } from "@/geom/primitives/orientedGeodesic";
import { buildEuclideanTriangle } from "@/geom/triangle/euclideanTriangle";
import type { HyperbolicTrianglePrimitives } from "@/geom/triangle/types";

const SUM_TOL = 1e-6;
const DIAMETER_EPS = 1e-12;

function safeAcosh(x: number): number {
    const clamped = Math.max(1, x);
    const sqrtTerm = Math.sqrt(Math.max(0, clamped * clamped - 1));
    return Math.log(clamped + sqrtTerm);
}

function sidesFromAnglesHyperbolic(
    alpha: number,
    beta: number,
    gamma: number,
): {
    a: number;
    b: number;
    c: number;
} {
    const sinAlpha = Math.sin(alpha);
    const sinBeta = Math.sin(beta);
    const sinGamma = Math.sin(gamma);

    const cosAlpha = Math.cos(alpha);
    const cosBeta = Math.cos(beta);
    const cosGamma = Math.cos(gamma);

    const coshA = (cosAlpha + cosBeta * cosGamma) / (sinBeta * sinGamma);
    const coshB = (cosBeta + cosGamma * cosAlpha) / (sinGamma * sinAlpha);
    const coshC = (cosGamma + cosAlpha * cosBeta) / (sinAlpha * sinBeta);

    return {
        a: safeAcosh(coshA),
        b: safeAcosh(coshB),
        c: safeAcosh(coshC),
    };
}

function placeVerticesOnDisk(a: number, b: number, c: number): [Vec2, Vec2, Vec2] {
    const coshA = Math.cosh(a);
    const coshB = Math.cosh(b);
    const coshC = Math.cosh(c);
    const sinhC = Math.sinh(c);
    const safeSinhC =
        Math.abs(sinhC) > DIAMETER_EPS ? sinhC : (Math.sign(sinhC) || 1) * DIAMETER_EPS;

    const x0 = coshB;
    const x1 = (coshC * x0 - coshA) / safeSinhC;
    const disc = Math.max(0, x0 * x0 - x1 * x1 - 1);
    const x2 = Math.sqrt(disc);

    const A: Vec2 = { x: 0, y: 0 };
    const B: Vec2 = { x: sinhC / (coshC + 1), y: 0 };
    const C: Vec2 = { x: x1 / (x0 + 1), y: x2 / (x0 + 1) };

    return [A, B, C];
}

type CircleDescriptor = {
    center: Vec2;
    radius: number;
};

function solveOrthogonalCircle(p: Vec2, q: Vec2): CircleDescriptor {
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const diff = { x: q.x - p.x, y: q.y - p.y };

    const a11 = diff.x;
    const a12 = diff.y;
    const b1 = diff.x * mid.x + diff.y * mid.y;

    let a21 = p.x;
    let a22 = p.y;
    let b2 = (1 + p.x * p.x + p.y * p.y) / 2;
    let det = a11 * a22 - a12 * a21;

    if (Math.abs(det) < DIAMETER_EPS) {
        a21 = q.x;
        a22 = q.y;
        b2 = (1 + q.x * q.x + q.y * q.y) / 2;
        det = a11 * a22 - a12 * a21;
    }

    if (Math.abs(det) < DIAMETER_EPS) {
        throw new Error("Degenerate orthocircle computation");
    }

    const invDet = 1 / det;
    const cx = (b1 * a22 - a12 * b2) * invDet;
    const cy = (a11 * b2 - b1 * a21) * invDet;
    const radiusSq = Math.max(0, cx * cx + cy * cy - 1);

    return {
        center: { x: cx, y: cy },
        radius: Math.sqrt(radiusSq),
    };
}

function chooseDiameterDirection(p: Vec2, q: Vec2): Vec2 {
    const lp = Math.hypot(p.x, p.y);
    const lq = Math.hypot(q.x, q.y);
    if (lp > DIAMETER_EPS) {
        return p;
    }
    if (lq > DIAMETER_EPS) {
        return q;
    }
    return { x: 1, y: 0 };
}

function geodesicThroughPoints(p: Vec2, q: Vec2, interior: Vec2): OrientedGeodesic {
    const cross = p.x * q.y - p.y * q.x;
    if (Math.abs(cross) < DIAMETER_EPS) {
        const dir = chooseDiameterDirection(p, q);
        const plane = buildDiameterHalfPlaneFromDir(dir, interior);
        return orientedLineFromHalfPlane(plane);
    }

    const { center, radius } = solveOrthogonalCircle(p, q);
    return orientedCircleFromCircleGeodesic(center, radius, interior);
}

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

    const { a, b, c: sideC } = sidesFromAnglesHyperbolic(alpha, beta, gamma);
    const vertices = placeVerticesOnDisk(a, b, sideC);
    const interior: Vec2 = {
        x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
        y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
    };

    const edgeA = geodesicThroughPoints(vertices[1], vertices[2], interior);
    const edgeB = geodesicThroughPoints(vertices[2], vertices[0], interior);
    const edgeC = geodesicThroughPoints(vertices[0], vertices[1], interior);

    return {
        kind: GEOMETRY_KIND.hyperbolic,
        boundaries: [edgeC, edgeB, edgeA],
        vertices,
        angles: [alpha, beta, gamma],
    };
}

/** @deprecated Prefer buildHyperbolicTriangle */
export const buildFundamentalTriangle = buildHyperbolicTriangle;
