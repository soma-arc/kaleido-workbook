import { crossVec3, dotVec3, normalizeVec3, type Vec3 } from "@/geom/spherical/types";

export type OrbitCameraOptions = {
    azimuth?: number;
    elevation?: number;
    distance?: number;
    minDistance?: number;
    maxDistance?: number;
    minElevation?: number;
    maxElevation?: number;
};

const DEFAULT_DISTANCE = 3;
const DEFAULT_MIN_DISTANCE = 1.2;
const DEFAULT_MAX_DISTANCE = 12;
const DEFAULT_MIN_ELEVATION = -Math.PI / 2 + 0.01;
const DEFAULT_MAX_ELEVATION = Math.PI / 2 - 0.01;

/**
 * 球面モード用の簡易 Orbit カメラ。three.js の OrbitControls に近い操作体系を提供し、
 * 注視点を常に原点に固定する。
 */
export class SphericalOrbitCamera {
    private azimuth: number;

    private elevation: number;

    private distance: number;

    private readonly minDistance: number;

    private readonly maxDistance: number;

    private readonly minElevation: number;

    private readonly maxElevation: number;

    public constructor(options: OrbitCameraOptions = {}) {
        this.azimuth = options.azimuth ?? 0;
        this.elevation = clamp(
            options.elevation ?? 0,
            options.minElevation ?? DEFAULT_MIN_ELEVATION,
            options.maxElevation ?? DEFAULT_MAX_ELEVATION,
        );
        this.distance = clamp(
            options.distance ?? DEFAULT_DISTANCE,
            options.minDistance ?? DEFAULT_MIN_DISTANCE,
            options.maxDistance ?? DEFAULT_MAX_DISTANCE,
        );
        this.minDistance = options.minDistance ?? DEFAULT_MIN_DISTANCE;
        this.maxDistance = options.maxDistance ?? DEFAULT_MAX_DISTANCE;
        this.minElevation = options.minElevation ?? DEFAULT_MIN_ELEVATION;
        this.maxElevation = options.maxElevation ?? DEFAULT_MAX_ELEVATION;
    }

    /**
     * 方位角（azimuth）と仰角（elevation）を指定分だけ回転する。
     */
    public orbit(deltaAzimuth: number, deltaElevation: number): void {
        this.azimuth = normalizeAngle(this.azimuth + deltaAzimuth);
        this.elevation = clamp(
            this.elevation + deltaElevation,
            this.minElevation,
            this.maxElevation,
        );
    }

    /**
     * ズーム操作。距離を加算し、設定された最小/最大距離でクランプする。
     */
    public zoom(deltaDistance: number): void {
        this.distance = clamp(this.distance + deltaDistance, this.minDistance, this.maxDistance);
    }

    /**
     * カメラの現在の位置（ワールド座標）を返す。
     */
    public getEyePosition(): Vec3 {
        const cosElevation = Math.cos(this.elevation);
        const sinElevation = Math.sin(this.elevation);
        const sinAzimuth = Math.sin(this.azimuth);
        const cosAzimuth = Math.cos(this.azimuth);
        return {
            x: this.distance * cosElevation * sinAzimuth,
            y: this.distance * sinElevation,
            z: this.distance * cosElevation * cosAzimuth,
        };
    }

    /**
     * ビュー行列（列優先 4x4）を返す。注視点は原点、アップベクトルは (0,1,0)。
     */
    public getViewMatrix(): Float32Array {
        const eye = this.getEyePosition();
        return lookAt(eye, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    }

    /**
     * 現在のカメラ設定を取得する。UI 側でスライダ等に反映させる用途を想定。
     */
    public getState(): { azimuth: number; elevation: number; distance: number } {
        return {
            azimuth: this.azimuth,
            elevation: this.elevation,
            distance: this.distance,
        };
    }

    /**
     * カメラ状態を直接設定する。バリデーションのため各種制限を適用する。
     */
    public setState(state: { azimuth?: number; elevation?: number; distance?: number }): void {
        if (typeof state.azimuth === "number") {
            this.azimuth = normalizeAngle(state.azimuth);
        }
        if (typeof state.elevation === "number") {
            this.elevation = clamp(state.elevation, this.minElevation, this.maxElevation);
        }
        if (typeof state.distance === "number") {
            this.distance = clamp(state.distance, this.minDistance, this.maxDistance);
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function normalizeAngle(value: number): number {
    const twoPi = Math.PI * 2;
    let result = value % twoPi;
    if (result <= -Math.PI) result += twoPi;
    if (result > Math.PI) result -= twoPi;
    return result;
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
    const forward = normalizeVec3({
        x: target.x - eye.x,
        y: target.y - eye.y,
        z: target.z - eye.z,
    });
    const right = normalizeVec3(crossVec3(forward, up));
    const upVec = crossVec3(right, forward);

    const m00 = right.x;
    const m01 = upVec.x;
    const m02 = -forward.x;
    const m10 = right.y;
    const m11 = upVec.y;
    const m12 = -forward.y;
    const m20 = right.z;
    const m21 = upVec.z;
    const m22 = -forward.z;

    const tx = -dotVec3(right, eye);
    const ty = -dotVec3(upVec, eye);
    const tz = dotVec3(forward, eye);

    return new Float32Array([m00, m01, m02, 0, m10, m11, m12, 0, m20, m21, m22, 0, tx, ty, tz, 1]);
}
