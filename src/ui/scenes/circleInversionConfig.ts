import type { Vec2 } from "@/geom/core/types";

export interface CircleInversionState {
    fixedCircle: {
        center: Vec2;
        radius: number;
    };
    rectangle: {
        center: Vec2;
        halfExtents: Vec2;
        rotation: number;
    };
}

export type CircleInversionSceneConfig = CircleInversionState;
