import type { Vec2 } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";

export type ControlPointId = string;

export type ControlPoint = Vec2 & {
    id: ControlPointId;
    fixed: boolean;
};

export type HalfPlaneControlPoints = [ControlPoint, ControlPoint];

export type ControlPointAssignment = {
    planeIndex: number;
    pointIndex: 0 | 1;
    id: ControlPointId;
    fixed?: boolean;
};

export type ControlPointTable = Record<ControlPointId, ControlPoint>;

const EPS = 1e-12;

let controlPointCounter = 0;

function nextControlPointId(): ControlPointId {
    controlPointCounter += 1;
    return `cp-${controlPointCounter.toString(36)}`;
}

export function resetControlPointIdCounter(): void {
    controlPointCounter = 0;
}

function rotate90CW(v: Vec2): Vec2 {
    return { x: v.y, y: -v.x };
}

function rotate90CCW(v: Vec2): Vec2 {
    return { x: -v.y, y: v.x };
}

function createControlPoint(
    base: Vec2,
    id: ControlPointId | undefined,
    registry: ControlPointTable,
    fixed = false,
): ControlPoint {
    const resolvedId = id ?? nextControlPointId();
    const existing = registry[resolvedId];
    if (existing) {
        const shouldFix = existing.fixed || fixed;
        const samePosition = existing.x === base.x && existing.y === base.y;
        if (samePosition && shouldFix === existing.fixed) {
            return existing;
        }
        const updated: ControlPoint = { id: resolvedId, x: base.x, y: base.y, fixed: shouldFix };
        registry[resolvedId] = updated;
        return updated;
    }
    const created: ControlPoint = { id: resolvedId, x: base.x, y: base.y, fixed };
    registry[resolvedId] = created;
    return created;
}

export function deriveHalfPlaneFromPoints(points: Readonly<[Vec2, Vec2]>): HalfPlane {
    const [a, b] = points;
    const tangent = { x: b.x - a.x, y: b.y - a.y };
    const tangentLen = Math.hypot(tangent.x, tangent.y);
    if (!(tangentLen > EPS)) {
        throw new Error("Half-plane control points must not coincide");
    }
    const invLen = 1 / tangentLen;
    const normal = rotate90CW({ x: tangent.x * invLen, y: tangent.y * invLen });
    const offset = -(normal.x * a.x + normal.y * a.y);
    return normalizeHalfPlane({ normal, offset });
}

/**
 * Reorients the half-plane so that the provided reference point lies on its non-negative side.
 */
export function orientHalfPlaneTowardPoint(plane: HalfPlane, point: Vec2): HalfPlane {
    const unit = normalizeHalfPlane(plane);
    const value = unit.normal.x * point.x + unit.normal.y * point.y + unit.offset;
    if (value >= 0) {
        return unit;
    }
    return {
        normal: { x: -unit.normal.x, y: -unit.normal.y },
        offset: -unit.offset,
    };
}

/**
 * Ensures the half-plane faces the origin (0,0).
 */
export function orientHalfPlaneTowardOrigin(plane: HalfPlane): HalfPlane {
    return orientHalfPlaneTowardPoint(plane, { x: 0, y: 0 });
}

export function derivePointsFromHalfPlane(plane: HalfPlane, spacing: number): [Vec2, Vec2] {
    if (!(spacing > EPS)) {
        throw new Error("Half-plane control spacing must be positive");
    }
    const unit = normalizeHalfPlane(plane);
    const origin = {
        x: -unit.offset * unit.normal.x,
        y: -unit.offset * unit.normal.y,
    };
    const tangent = rotate90CCW(unit.normal);
    return [
        origin,
        {
            x: origin.x + tangent.x * spacing,
            y: origin.y + tangent.y * spacing,
        },
    ];
}

export function controlPointsFromHalfPlanes(
    planes: HalfPlane[],
    spacing: number,
    assignments: ControlPointAssignment[] = [],
): HalfPlaneControlPoints[] {
    const registry: ControlPointTable = {};
    const assignmentMap = new Map<string, ControlPointAssignment>();
    for (const assignment of assignments) {
        const key = `${assignment.planeIndex}:${assignment.pointIndex}`;
        assignmentMap.set(key, assignment);
    }

    return planes.map((plane, planeIndex) => {
        const [p0, p1] = derivePointsFromHalfPlane(plane, spacing);
        const assignment0 = assignmentMap.get(`${planeIndex}:0`);
        const assignment1 = assignmentMap.get(`${planeIndex}:1`);
        const cp0 = createControlPoint(p0, assignment0?.id, registry, assignment0?.fixed ?? false);
        const cp1 = createControlPoint(p1, assignment1?.id, registry, assignment1?.fixed ?? false);
        return [cp0, cp1];
    });
}

export function controlPointTableFromControls(
    controls: HalfPlaneControlPoints[],
): ControlPointTable {
    return controls.reduce<ControlPointTable>((table, [a, b]) => {
        table[a.id] = a;
        table[b.id] = b;
        return table;
    }, {});
}
