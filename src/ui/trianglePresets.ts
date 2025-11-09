import type { GeometryKind } from "@/geom/core/types";
import { GEOMETRY_KIND } from "@/geom/core/types";
import {
    createRegularIcosahedronTriangle,
    createRegularOctahedronTriangle,
    createRightDihedralTriangle,
} from "@/geom/spherical/polyhedra";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import type { SphericalSceneState, SphericalTriangle } from "@/geom/spherical/types";

export type GeometryMode = GeometryKind;

export type TrianglePresetCategory = "classic" | "polyhedron";

export type TrianglePreset = {
    id: string;
    label: string;
    p: number;
    q: number;
    r: number;
    geometry: GeometryMode;
    category: TrianglePresetCategory;
    description?: string;
    spherical?: {
        buildState: () => SphericalSceneState;
    };
};

export type TrianglePresetGroup = {
    category: TrianglePresetCategory;
    label: string;
    presets: TrianglePreset[];
};

function createSphericalStateFromTriangle(triangle: SphericalTriangle): SphericalSceneState {
    return {
        triangle: {
            vertices: triangle.vertices.map((vertex) => ({
                ...vertex,
            })) as SphericalTriangle["vertices"],
        },
        handles: {},
    };
}

const HYPERBOLIC_GROUPS: TrianglePresetGroup[] = [
    {
        category: "classic",
        label: "Classics",
        presets: [
            {
                id: "hyp-237",
                label: "(2,3,7)",
                p: 2,
                q: 3,
                r: 7,
                geometry: GEOMETRY_KIND.hyperbolic,
                category: "classic",
            },
            {
                id: "hyp-245",
                label: "(2,4,5)",
                p: 2,
                q: 4,
                r: 5,
                geometry: GEOMETRY_KIND.hyperbolic,
                category: "classic",
            },
            {
                id: "hyp-334",
                label: "(3,3,4)",
                p: 3,
                q: 3,
                r: 4,
                geometry: GEOMETRY_KIND.hyperbolic,
                category: "classic",
            },
        ],
    },
];

const EUCLIDEAN_GROUPS: TrianglePresetGroup[] = [
    {
        category: "classic",
        label: "Classics",
        presets: [
            {
                id: "euc-333",
                label: "(3,3,3)",
                p: 3,
                q: 3,
                r: 3,
                geometry: GEOMETRY_KIND.euclidean,
                category: "classic",
            },
            {
                id: "euc-244",
                label: "(2,4,4)",
                p: 2,
                q: 4,
                r: 4,
                geometry: GEOMETRY_KIND.euclidean,
                category: "classic",
            },
            {
                id: "euc-236",
                label: "(2,3,6)",
                p: 2,
                q: 3,
                r: 6,
                geometry: GEOMETRY_KIND.euclidean,
                category: "classic",
            },
        ],
    },
];

const SPHERICAL_POLYHEDRON_PRESETS: TrianglePreset[] = [
    {
        id: "sph-tetrahedron",
        label: "Tetrahedron (2,3,3)",
        p: 2,
        q: 3,
        r: 3,
        geometry: GEOMETRY_KIND.spherical,
        category: "polyhedron",
        spherical: {
            buildState: () => createSphericalStateFromTriangle(createRegularTetrahedronTriangle()),
        },
    },
    {
        id: "sph-octahedron",
        label: "Octahedron (2,3,4)",
        p: 2,
        q: 3,
        r: 4,
        geometry: GEOMETRY_KIND.spherical,
        category: "polyhedron",
        spherical: {
            buildState: () => createSphericalStateFromTriangle(createRegularOctahedronTriangle()),
        },
    },
    {
        id: "sph-icosahedron",
        label: "Icosahedron (2,3,5)",
        p: 2,
        q: 3,
        r: 5,
        geometry: GEOMETRY_KIND.spherical,
        category: "polyhedron",
        spherical: {
            buildState: () => createSphericalStateFromTriangle(createRegularIcosahedronTriangle()),
        },
    },
];

const DIGON_PRESETS: TrianglePreset[] = Array.from({ length: 11 }, (_, index) => index + 2).map(
    (n) => ({
        id: `sph-22${n}`,
        label: `(2,2,${n})`,
        p: 2,
        q: 2,
        r: n,
        geometry: GEOMETRY_KIND.spherical,
        category: "polyhedron",
        spherical: {
            buildState: () => createSphericalStateFromTriangle(createRightDihedralTriangle(n)),
        },
    }),
);

const SPHERICAL_GROUPS: TrianglePresetGroup[] = [
    {
        category: "polyhedron",
        label: "Polyhedron",
        presets: [...SPHERICAL_POLYHEDRON_PRESETS, ...DIGON_PRESETS],
    },
];

const PRESET_GROUPS_BY_MODE: Record<GeometryMode, TrianglePresetGroup[]> = {
    [GEOMETRY_KIND.hyperbolic]: HYPERBOLIC_GROUPS,
    [GEOMETRY_KIND.euclidean]: EUCLIDEAN_GROUPS,
    [GEOMETRY_KIND.spherical]: SPHERICAL_GROUPS,
};

export const DEFAULT_HYPERBOLIC_PRESET = HYPERBOLIC_GROUPS[0].presets[0];
export const DEFAULT_EUCLIDEAN_PRESET = EUCLIDEAN_GROUPS[0].presets[0];
const DEFAULT_SPHERICAL_PRESET_ID = "sph-226";

export const DEFAULT_SPHERICAL_PRESET =
    [...SPHERICAL_GROUPS.flatMap((group) => group.presets)].find(
        (preset) => preset.id === DEFAULT_SPHERICAL_PRESET_ID,
    ) ?? SPHERICAL_GROUPS[0].presets[0];

export function getPresetGroupsForGeometry(mode: GeometryMode): readonly TrianglePresetGroup[] {
    return PRESET_GROUPS_BY_MODE[mode];
}

export function getPresetsForGeometry(mode: GeometryMode): readonly TrianglePreset[] {
    return PRESET_GROUPS_BY_MODE[mode].flatMap((group) => group.presets);
}

export function findTrianglePresetById(id: string): TrianglePreset | undefined {
    return getAllPresets().find((preset) => preset.id === id);
}

function getAllPresets(): TrianglePreset[] {
    return Object.values(PRESET_GROUPS_BY_MODE).flatMap((groups) =>
        groups.flatMap((group) => group.presets),
    );
}
