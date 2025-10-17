import type { Vec2 } from "@/geom/core/types";

export interface CircleInversionDisplayOptions {
    showReferenceLine: boolean;
    showInvertedLine: boolean;
    showReferenceRectangle: boolean;
    showInvertedRectangle: boolean;
    textureEnabled: boolean;
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
    display: CircleInversionDisplayOptions;
}

export type CircleInversionSceneConfig = CircleInversionState;
