import { normalizeAngle0ToTau, normalizeAngleMinusPiToPi } from "@/geom/core/math";
import type { Vec2 } from "@/geom/core/types";
import { angleToBoundaryPoint, boundaryPointToAngle } from "@/geom/primitives/unitDisk";

const TAU = 2 * Math.PI;

/**
 * Round angle to the nearest N-division on [0, 2π), ties go to the upper (+) side.
 * Returns a value normalized to (-π, π].
 */
export function snapAngle(theta: number, N: number): number {
    if (!Number.isFinite(theta)) return 0;
    const n = Math.max(1, Math.floor(Math.abs(N)) || 1);
    const step = TAU / n;
    const t0 = normalizeAngle0ToTau(theta);
    // half-up: add step/2 then floor
    const k = Math.floor((t0 + step / 2) / step);
    const snapped = k * step;
    return normalizeAngleMinusPiToPi(snapped);
}

/**
 * Snap a point on/near the boundary to the nearest N-division direction and return a unit vector.
 */
export function snapBoundaryPoint(p: Vec2, N: number): Vec2 {
    const theta = boundaryPointToAngle(p);
    const s = snapAngle(theta, N);
    return angleToBoundaryPoint(s);
}
