import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";

const DEG_PER_RAD = 180 / Math.PI;
const EPS = 1e-9;

export type HingePlaneAngles = {
    /** 個別鏡の向き（度数法, 0-360）。未計測時は null */
    planeAngles: [number | null, number | null];
    /** 2 本の鏡の最小開き角（度数法, 0-180）。未計測時は null */
    hingeAngle: number | null;
};

function normalizeDegrees(value: number): number {
    const normalized = value % 360;
    return normalized < 0 ? normalized + 360 : normalized;
}

function roundToTenths(value: number): number {
    return Math.round(value * 10) / 10;
}

function extractHingeAndFreePoints(
    points: HalfPlaneControlPoints,
): { hinge: { x: number; y: number }; free: { x: number; y: number } } | null {
    const hingePoint = points.find((point) => point.fixed || point.id === "hinge");
    const freePoint = points.find((point) => point !== hingePoint);
    if (!hingePoint || !freePoint) {
        return null;
    }
    if (Math.abs(freePoint.x - hingePoint.x) < EPS && Math.abs(freePoint.y - hingePoint.y) < EPS) {
        return null;
    }
    return { hinge: hingePoint, free: freePoint };
}

function computePlaneAngle(points: HalfPlaneControlPoints | undefined): number | null {
    if (!points) {
        return null;
    }
    const resolved = extractHingeAndFreePoints(points);
    if (!resolved) {
        return null;
    }
    const { hinge, free } = resolved;
    const dx = free.x - hinge.x;
    const dy = free.y - hinge.y;
    const radians = Math.atan2(dy, dx);
    const degrees = normalizeDegrees(radians * DEG_PER_RAD);
    return roundToTenths(degrees);
}

function computeHingeDifference(a: number | null, b: number | null): number | null {
    if (a === null || b === null) {
        return null;
    }
    const diff = Math.abs(((a - b + 540) % 360) - 180);
    return roundToTenths(diff);
}

export function computeHingeAngles(
    points: HalfPlaneControlPoints[] | null | undefined,
): HingePlaneAngles {
    const angleA = computePlaneAngle(points?.[0]);
    const angleB = computePlaneAngle(points?.[1]);
    const hingeAngle = computeHingeDifference(angleA, angleB);
    return { planeAngles: [angleA, angleB], hingeAngle };
}
