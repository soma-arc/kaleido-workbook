import type { Vec2 } from "@/geom/core/types";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";

export interface CircleInversionDisplayOptions {
    showReferenceLine: boolean;
    showInvertedLine: boolean;
    showReferenceRectangle: boolean;
    showInvertedRectangle: boolean;
    textureEnabled: boolean;
    showSecondaryRectangle: boolean;
    showSecondaryInvertedRectangle: boolean;
}

export interface CircleInversionLineState {
    start: Vec2;
    end: Vec2;
}

export interface CircleInversionRectangleState {
    center: Vec2;
    halfExtents: Vec2;
    rotation: number;
}

export interface CircleInversionState {
    fixedCircle: {
        center: Vec2;
        radius: number;
    };
    line: CircleInversionLineState;
    rectangle: CircleInversionRectangleState;
    secondaryRectangle: CircleInversionRectangleState;
    display: CircleInversionDisplayOptions;
}

export type CircleInversionSceneConfig = CircleInversionState;

export function cloneCircleInversionState(state: CircleInversionState): CircleInversionState {
    return {
        fixedCircle: {
            center: { x: state.fixedCircle.center.x, y: state.fixedCircle.center.y },
            radius: state.fixedCircle.radius,
        },
        line: {
            start: { x: state.line.start.x, y: state.line.start.y },
            end: { x: state.line.end.x, y: state.line.end.y },
        },
        rectangle: {
            center: { x: state.rectangle.center.x, y: state.rectangle.center.y },
            halfExtents: {
                x: state.rectangle.halfExtents.x,
                y: state.rectangle.halfExtents.y,
            },
            rotation: state.rectangle.rotation,
        },
        secondaryRectangle: {
            center: { x: state.secondaryRectangle.center.x, y: state.secondaryRectangle.center.y },
            halfExtents: {
                x: state.secondaryRectangle.halfExtents.x,
                y: state.secondaryRectangle.halfExtents.y,
            },
            rotation: state.secondaryRectangle.rotation,
        },
        display: { ...state.display },
    };
}

export function updateCircleInversionLineFromControls(
    state: CircleInversionState,
    controlPoints: HalfPlaneControlPoints,
): CircleInversionState {
    const [start, end] = controlPoints;
    if (!start || !end) {
        return state;
    }
    const sameStart = state.line.start.x === start.x && state.line.start.y === start.y;
    const sameEnd = state.line.end.x === end.x && state.line.end.y === end.y;
    if (sameStart && sameEnd) {
        return state;
    }
    const next = cloneCircleInversionState(state);
    next.line.start = { x: start.x, y: start.y };
    next.line.end = { x: end.x, y: end.y };
    return next;
}

export function updateCircleInversionDisplay(
    state: CircleInversionState,
    patch: Partial<CircleInversionDisplayOptions>,
): CircleInversionState {
    const nextValues: CircleInversionDisplayOptions = { ...state.display };
    let changed = false;
    for (const [key, value] of Object.entries(patch) as [
        keyof CircleInversionDisplayOptions,
        CircleInversionDisplayOptions[keyof CircleInversionDisplayOptions],
    ][]) {
        if (value === undefined || nextValues[key] === value) {
            continue;
        }
        nextValues[key] = value;
        changed = true;
    }
    if (!changed) {
        return state;
    }
    const next = cloneCircleInversionState(state);
    next.display = nextValues;
    return next;
}
