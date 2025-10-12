import { g } from "vitest/dist/chunks/suite.B2jumIFP.js";
import type { Vec2 } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { Geodesic } from "@/geom/primitives/geodesic";
import { GEODESIC_KIND, geodesicFromBoundary } from "@/geom/primitives/geodesic";
import { evaluateHalfPlane, type HalfPlane, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import { solveThirdMirror, unitDirection } from "@/geom/triangle/thirdMirror";
import type { HyperbolicTrianglePrimitives } from "@/geom/triangle/types";

/**
 * Construct canonical hyperbolic triangle primitives on the Poincaré unit disk.
 *
 * Overview
 * - Mirrors are Poincaré geodesics (diameter or circle) whose interior angles are (π/p, π/q, π/r).
 * - The triangle is placed in a canonical pose: g1 on the x-axis, g2 rotated by α = π/p,
 *   g3 an orthogonal circle in the upper half plane.
 * - The resulting primitive set only encodes mirrors/vertices/angles so that higher level tiling
 *   code can operate on geometric primitives without embedding tiling semantics here.
 */

function buildDiameterHalfPlaneFromDir(dir: Vec2, interiorPoint: Vec2, reference: Vec2): HalfPlane {
    const length = Math.hypot(dir.x, dir.y) || 1;
    const unitDir = { x: dir.x / length, y: dir.y / length };
    let plane = normalizeHalfPlane({
        anchor: { x: 0, y: 0 },
        normal: { x: -unitDir.y, y: unitDir.x },
    });
    const cross = reference.x * plane.normal.y - reference.y * plane.normal.x;
    if (cross < 0) {
        plane = normalizeHalfPlane({
            anchor: { x: plane.anchor.x, y: plane.anchor.y },
            normal: { x: -plane.normal.x, y: -plane.normal.y },
        });
    }
    if (evaluateHalfPlane(plane, interiorPoint) <= 0) {
        plane = normalizeHalfPlane({
            anchor: { x: plane.anchor.x, y: plane.anchor.y },
            normal: { x: -plane.normal.x, y: -plane.normal.y },
        });
    }
    return plane;
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
    if (hyperbolicConstraint >= 1) {
        console.warn(
            `[HyperbolicTriangle] (p,q,r)=(${p},${q},${r}) does not satisfy hyperbolic constraint; continuing with computed mirrors`,
        );
    }
    const alpha = Math.PI / p;
    const beta = Math.PI / q;
    const gamma = Math.PI / r;

    // g1, g2: diameters crossing at origin with angle alpha
    // Create as geodesics from boundary: endpoints at angles 0 and π, and at α and α+π
    const g1: Geodesic = geodesicFromBoundary({ x: 1, y: 0 }, { x: -1, y: 0 });
    const aDir = unitDirection(alpha);
    const g2: Geodesic = geodesicFromBoundary({ x: -aDir.x, y: -aDir.y }, aDir);

    const third = solveThirdMirror(alpha, beta, gamma);
    const g3: Geodesic = { kind: GEODESIC_KIND.circle, c: third.c, r: third.r };

    // vertices: v0 = origin (g1∩g2), v1 = g1∩g3 on x-axis, v2 = g2∩g3 on line alpha
    const v0: Vec2 = { x: 0, y: 0 };
    const t = third;
    const cx = t.c.x,
        cy = t.c.y,
        rad = t.r;
    // v1 on x-axis solves (x-cx)^2 + (0-cy)^2 = r^2 -> pick the one in (0,1)
    const dx = Math.sqrt(Math.max(0, rad * rad - cy * cy));
    const cand1 = cx - dx;
    const cand2 = cx + dx;
    const pick = (x: number) => (x > 0 && x < 1 ? x : NaN);
    let x1 = Number.isFinite(pick(cand1)) ? cand1 : cand2;
    if (!(x1 > 0 && x1 < 1)) x1 = Math.max(1e-6, Math.min(0.999, cand1));
    const v1: Vec2 = { x: x1, y: 0 };

    // v2 on line through origin with direction aDir: s·u with |s·u − c| = r
    const cdotu = cx * aDir.x + cy * aDir.y;
    const disc = cdotu * cdotu - (cx * cx + cy * cy - rad * rad);
    const root = Math.sqrt(Math.max(0, disc));
    const s = cdotu - root;
    const v2: Vec2 = { x: s * aDir.x, y: s * aDir.y };

    const interior: Vec2 = {
        x: (v0.x + v1.x + v2.x) / 3,
        y: (v0.y + v1.y + v2.y) / 3,
    };

    const referenceNormal = { x: 0, y: 1 };
    const halfPlaneG1 = buildDiameterHalfPlaneFromDir({ x: 1, y: 0 }, interior, referenceNormal);
    const halfPlaneG2 =
        g2.kind === GEODESIC_KIND.diameter
            ? buildDiameterHalfPlaneFromDir(g2.dir, interior, referenceNormal)
            : null;
    return {
        kind: GEOMETRY_KIND.hyperbolic,
        mirrors: [g1, g2, g3],
        vertices: [v0, v1, v2],
        angles: [alpha, beta, gamma],
        halfPlanes: [halfPlaneG1, halfPlaneG2, null],
    };
}

/** @deprecated Prefer buildHyperbolicTriangle */
export const buildFundamentalTriangle = buildHyperbolicTriangle;
