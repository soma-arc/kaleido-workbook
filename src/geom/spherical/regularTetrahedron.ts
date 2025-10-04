import type { SphericalTriangle, SphericalVertex } from "./types";
import { isRightHandedTriangle, normalizeVec3 } from "./types";

const BASE_VERTICES: readonly SphericalVertex[] = [
    { x: 1, y: 1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
].map((vertex) => normalizeVec3(vertex)) as readonly SphericalVertex[];

const FACE_INDEX_SETS: readonly [number, number, number][] = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
];

/**
 * 正四面体の頂点を単位球上で返す。順序は右手系を維持するように揃えている。
 */
export function createRegularTetrahedronVertices(): readonly [
    SphericalVertex,
    SphericalVertex,
    SphericalVertex,
    SphericalVertex,
] {
    return BASE_VERTICES.map((vertex) => ({ ...vertex })) as unknown as [
        SphericalVertex,
        SphericalVertex,
        SphericalVertex,
        SphericalVertex,
    ];
}

/**
 * 正四面体の指定した面を球面三角形として返す。面番号は 0–3。
 * 無効な面を指定した場合は 0 番面を返す。
 */
export function createRegularTetrahedronTriangle(faceIndex = 0): SphericalTriangle {
    const vertices = createRegularTetrahedronVertices();
    const clamped = FACE_INDEX_SETS[faceIndex] ?? FACE_INDEX_SETS[0];
    const triangle: SphericalTriangle = {
        vertices: [
            { ...vertices[clamped[0]] },
            { ...vertices[clamped[1]] },
            { ...vertices[clamped[2]] },
        ],
    };
    if (!isRightHandedTriangle(triangle)) {
        triangle.vertices = [triangle.vertices[0], triangle.vertices[2], triangle.vertices[1]];
    }
    return triangle;
}

/**
 * 球面三角形を面番号に対応付けて列挙するヘルパー。
 */
export function createRegularTetrahedronTriangles(): readonly SphericalTriangle[] {
    return FACE_INDEX_SETS.map((_, index) => createRegularTetrahedronTriangle(index));
}
