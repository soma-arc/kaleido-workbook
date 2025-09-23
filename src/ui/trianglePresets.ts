import type { GeometryKind } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";

export type GeometryMode = GeometryKind;

export type TrianglePreset = {
    label: string;
    p: number;
    q: number;
    r: number;
};

const HYPERBOLIC_PRESETS: TrianglePreset[] = [
    { label: "(2,3,7)", p: 2, q: 3, r: 7 },
    { label: "(2,4,5)", p: 2, q: 4, r: 5 },
    { label: "(3,3,4)", p: 3, q: 3, r: 4 },
];

const EUCLIDEAN_PRESETS: TrianglePreset[] = [
    { label: "(3,3,3)", p: 3, q: 3, r: 3 },
    { label: "(2,4,4)", p: 2, q: 4, r: 4 },
    { label: "(2,3,6)", p: 2, q: 3, r: 6 },
];

const PRESETS_BY_MODE: Record<GeometryMode, TrianglePreset[]> = {
    [GEOMETRY_KIND.hyperbolic]: HYPERBOLIC_PRESETS,
    [GEOMETRY_KIND.euclidean]: EUCLIDEAN_PRESETS,
};

export const DEFAULT_HYPERBOLIC_PRESET = HYPERBOLIC_PRESETS[0];
export const DEFAULT_EUCLIDEAN_PRESET = EUCLIDEAN_PRESETS[0];

export function getPresetsForGeometry(mode: GeometryMode): readonly TrianglePreset[] {
    return PRESETS_BY_MODE[mode];
}
