import type { SphericalTriangle } from "@/geom/spherical/types";
import { crossVec3, dotVec3, isUnitVec3, normalizeVec3 } from "@/geom/spherical/types";
import type { SphericalOrbitCamera } from "./camera";

export type ProjectionParams = {
    aspect: number;
    fovY?: number;
    near?: number;
    far?: number;
};

export type CameraUniforms = {
    view: Float32Array;
    projection: Float32Array;
    viewProjection: Float32Array;
    cameraPosition: Float32Array;
};

const DEFAULT_FOVY = Math.PI / 4;
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 100;

/**
 * 球面三角形の 3 頂点をフラットな Float32Array としてパックする。
 */
export function packSphericalTriangleVertices(triangle: SphericalTriangle): Float32Array {
    const buffer = new Float32Array(9);
    triangle.vertices.forEach((vertex, index) => {
        const offset = index * 3;
        buffer[offset] = vertex.x;
        buffer[offset + 1] = vertex.y;
        buffer[offset + 2] = vertex.z;
    });
    return buffer;
}

/**
 * 球面三角形の各辺を規定する「内向き」平面法線をパックする。
 * 返却値のインデックスは頂点順に対応し、`triangle.vertices[i]` と
 * `triangle.vertices[(i + 1) % 3]` を通る大円の法線ベクトルを格納する。
 */
export function packSphericalTrianglePlanes(triangle: SphericalTriangle): Float32Array {
    const buffer = new Float32Array(9);
    triangle.vertices.forEach((vertex, index) => {
        const next = triangle.vertices[(index + 1) % 3];
        const opposite = triangle.vertices[(index + 2) % 3];
        let normal = crossVec3(vertex, next);
        if (dotVec3(normal, opposite) < 0) {
            normal = { x: -normal.x, y: -normal.y, z: -normal.z };
        }
        const unit = normalizeVec3(normal);
        const offset = index * 3;
        buffer[offset] = unit.x;
        buffer[offset + 1] = unit.y;
        buffer[offset + 2] = unit.z;
    });
    return buffer;
}

/**
 * カメラのビュー・プロジェクション行列を計算し、ユニフォームとして利用可能な形で返す。
 */
export function buildCameraUniforms(
    camera: SphericalOrbitCamera,
    params: ProjectionParams,
): CameraUniforms {
    const fovY = params.fovY ?? DEFAULT_FOVY;
    const near = params.near ?? DEFAULT_NEAR;
    const far = params.far ?? DEFAULT_FAR;
    if (!(params.aspect > 0)) {
        throw new Error("aspect ratio must be positive");
    }
    const view = camera.getViewMatrix();
    const projection = perspectiveMatrix(fovY, params.aspect, near, far);
    const viewProjection = multiplyMat4(projection, view);
    const eye = camera.getEyePosition();
    return {
        view,
        projection,
        viewProjection,
        cameraPosition: new Float32Array([eye.x, eye.y, eye.z]),
    };
}

function perspectiveMatrix(fovY: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan(fovY / 2);
    const rangeInv = 1 / (near - far);
    return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) * rangeInv,
        -1,
        0,
        0,
        2 * far * near * rangeInv,
        0,
    ]);
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(16);
    for (let col = 0; col < 4; col += 1) {
        for (let row = 0; row < 4; row += 1) {
            const index = col * 4 + row;
            const a0 = a[0 * 4 + row];
            const a1 = a[1 * 4 + row];
            const a2 = a[2 * 4 + row];
            const a3 = a[3 * 4 + row];
            const b0 = b[col * 4 + 0];
            const b1 = b[col * 4 + 1];
            const b2 = b[col * 4 + 2];
            const b3 = b[col * 4 + 3];
            result[index] = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
        }
    }
    return result;
}

/**
 * 球面三角形が単位球上で正しく定義されているかをざっくり検証する。
 */
export function validateSphericalTriangleVertices(triangle: SphericalTriangle): void {
    triangle.vertices.forEach((vertex) => {
        if (!isUnitVec3(vertex)) {
            throw new Error("triangle vertex is not on the unit sphere");
        }
    });
    const [v0, v1, v2] = triangle.vertices;
    const det = dotVec3(v0, crossVec3(v1, v2));
    if (!Number.isFinite(det)) {
        throw new Error("triangle determinant is invalid");
    }
}
