import {
    isRightHandedTriangle,
    normalizeVec3,
    type SphericalTriangle,
    type SphericalVertex,
} from "./types";

const OCTAHEDRON_VERTICES: readonly SphericalVertex[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
].map((vertex) => normalizeVec3(vertex));

const OCTAHEDRON_FACES: readonly [number, number, number][] = [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [0, 5, 2],
    [2, 5, 1],
    [1, 5, 3],
    [3, 5, 0],
];

const PHI = (1 + Math.sqrt(5)) / 2;

const ICOSAHEDRON_VERTICES: readonly SphericalVertex[] = [
    { x: -1, y: PHI, z: 0 },
    { x: 1, y: PHI, z: 0 },
    { x: -1, y: -PHI, z: 0 },
    { x: 1, y: -PHI, z: 0 },
    { x: 0, y: -1, z: PHI },
    { x: 0, y: 1, z: PHI },
    { x: 0, y: -1, z: -PHI },
    { x: 0, y: 1, z: -PHI },
    { x: PHI, y: 0, z: -1 },
    { x: PHI, y: 0, z: 1 },
    { x: -PHI, y: 0, z: -1 },
    { x: -PHI, y: 0, z: 1 },
].map((vertex) => normalizeVec3(vertex));

const ICOSAHEDRON_FACES: readonly [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
];

function buildTriangle(
    vertices: readonly SphericalVertex[],
    indices: readonly [number, number, number],
): SphericalTriangle {
    const triangle: SphericalTriangle = {
        vertices: indices.map((index) => ({ ...vertices[index] })) as SphericalTriangle["vertices"],
    };
    if (!isRightHandedTriangle(triangle)) {
        const [first, second, third] = triangle.vertices;
        triangle.vertices = [first, third, second];
    }
    return triangle;
}

export function createRegularOctahedronTriangle(faceIndex = 0): SphericalTriangle {
    const indices = OCTAHEDRON_FACES[faceIndex] ?? OCTAHEDRON_FACES[0];
    return buildTriangle(OCTAHEDRON_VERTICES, indices);
}

export function createRegularIcosahedronTriangle(faceIndex = 0): SphericalTriangle {
    const indices = ICOSAHEDRON_FACES[faceIndex] ?? ICOSAHEDRON_FACES[0];
    return buildTriangle(ICOSAHEDRON_VERTICES, indices);
}

export function createRightDihedralTriangle(n: number): SphericalTriangle {
    const clamped = Math.max(2, Math.floor(n));
    const northPole: SphericalVertex = { x: 0, y: 0, z: 1 };
    const pointB: SphericalVertex = { x: 1, y: 0, z: 0 };
    const longitude = Math.PI / clamped;
    const pointC: SphericalVertex = normalizeVec3({
        x: Math.cos(longitude),
        y: Math.sin(longitude),
        z: 0,
    });
    const triangle: SphericalTriangle = {
        vertices: [northPole, pointB, pointC],
    };
    if (!isRightHandedTriangle(triangle)) {
        triangle.vertices = [northPole, pointC, pointB];
    }
    return triangle;
}
