export type Vec = { x: number; y: number };

export type Circle = { c: Vec; r: number };

export type IntersectKind =
    | 'none'
    | 'tangent'
    | 'two'
    | 'concentric'
    | 'coincident';

export type IntersectResult = {
    kind: IntersectKind;
    points?: Vec[];
};

