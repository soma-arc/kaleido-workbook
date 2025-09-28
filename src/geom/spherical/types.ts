import type { Vec2 } from "@/geom/core/types";

/**
 * 3D ベクトルを表す型。球面座標系では単位球上の点として扱う。
 */
export type Vec3 = {
    x: number;
    y: number;
    z: number;
};

/**
 * 単位球上の頂点を表す型。`Vec3` のうち長さが 1 のものに限定する。
 */
export type SphericalVertex = Vec3;

/**
 * 球面三角形。3 つの球面頂点を大円弧で結んだ領域を表現する。
 */
export type SphericalTriangle = {
    vertices: [SphericalVertex, SphericalVertex, SphericalVertex];
};

/**
 * 球面三角形に付随する編集用メタデータ。
 * UI 側での制御点管理を見据えて、極座標値などをキャッシュできるようにする。
 */
export type SphericalTriangleHandles = {
    barycentricHint?: Vec2;
};

/**
 * 球面モード全体の状態を表す。将来的な拡張（複数三角形や制御情報）に備える。
 */
export type SphericalSceneState = {
    triangle: SphericalTriangle;
    handles: SphericalTriangleHandles;
};

/**
 * 3 次元ベクトルを正規化して単位ベクトルを得る。
 * 引数がゼロベクトルの場合は (1, 0, 0) を返す。
 */
export function normalizeVec3(vector: Vec3): Vec3 {
    const length = Math.hypot(vector.x, vector.y, vector.z);
    if (!Number.isFinite(length) || length === 0) {
        return { x: 1, y: 0, z: 0 };
    }
    const inv = 1 / length;
    return { x: vector.x * inv, y: vector.y * inv, z: vector.z * inv };
}

/**
 * 3 次元ベクトルの内積を計算する。
 */
export function dotVec3(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * 2 つの 3 次元ベクトルの外積を返す。
 */
export function crossVec3(a: Vec3, b: Vec3): Vec3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}

/**
 * 単位球上の点かどうかを判定する。許容誤差は 1e-12。
 */
export function isUnitVec3(vector: Vec3, tolerance = 1e-12): boolean {
    const lengthSq = vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
    return Math.abs(lengthSq - 1) <= tolerance;
}

/**
 * 与えられた球面三角形が右手系で整列しているかを判定する。
 * 具体的には v0, v1, v2 の順に外積を取り、法線が正規化済みであるかを見る。
 */
export function isRightHandedTriangle(triangle: SphericalTriangle, tolerance = 1e-12): boolean {
    const [v0, v1, v2] = triangle.vertices;
    const n = crossVec3(v0, v1);
    const dot = dotVec3(normalizeVec3(n), v2);
    return dot >= -tolerance;
}
