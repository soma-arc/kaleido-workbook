import type { Geodesic } from "@/geom/primitives/geodesic";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { RenderScene } from "../scene";

export const MAX_UNIFORM_GEODESICS = 256;
const COMPONENTS_PER_VEC4 = 4;

export type GeodesicUniformBuffers = {
    data: Float32Array;
};

export function createGeodesicUniformBuffers(
    limit: number = MAX_UNIFORM_GEODESICS,
): GeodesicUniformBuffers {
    const size = Math.max(0, limit | 0) * COMPONENTS_PER_VEC4;
    return {
        data: new Float32Array(size),
    };
}

export function packSceneGeodesics(
    scene: RenderScene,
    buffers: GeodesicUniformBuffers,
    limit: number = MAX_UNIFORM_GEODESICS,
): number {
    const maxCount = Math.min(limit, buffers.data.length / COMPONENTS_PER_VEC4);
    let count = 0;
    if (scene.geometry === "hyperbolic") {
        for (const primitive of scene.geodesics) {
            if (count >= maxCount) break;
            if (primitive.geodesic.kind === "circle") {
                packCircleGeodesic(primitive.geodesic, buffers, count);
            } else if (primitive.geodesic.kind === "diameter") {
                packDiameterGeodesic(primitive.geodesic, buffers, count);
            } else {
                packHalfPlaneGeodesic(primitive.geodesic, buffers, count);
            }
            count += 1;
        }
    } else {
        for (const plane of scene.halfPlanes) {
            if (count >= maxCount) break;
            packSceneHalfPlane(plane, buffers, count);
            count += 1;
        }
    }
    clearRemainder(buffers, count);
    return count;
}

function packCircleGeodesic(
    geo: Extract<Geodesic, { kind: "circle" }>,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const offset = index * COMPONENTS_PER_VEC4;
    const data = buffers.data;
    data[offset + 0] = geo.c.x;
    data[offset + 1] = geo.c.y;
    data[offset + 2] = geo.r;
    data[offset + 3] = 0; // kind = circle
}

function packDiameterGeodesic(
    geo: Extract<Geodesic, { kind: "diameter" }>,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const normal = normalize({ x: -geo.dir.y, y: geo.dir.x });
    packLine(normal, 0, buffers, index);
}

function packHalfPlaneGeodesic(
    geo: Extract<Geodesic, { kind: "halfPlane" }>,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    packLine(geo.normal, geo.offset, buffers, index);
}

function packSceneHalfPlane(
    plane: HalfPlane,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    packLine(plane.normal, plane.offset, buffers, index);
}

function packLine(
    normal: { x: number; y: number },
    offsetValue: number,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const unit = normalize(normal);
    const writeOffset = index * COMPONENTS_PER_VEC4;
    const data = buffers.data;
    data[writeOffset + 0] = unit.x;
    data[writeOffset + 1] = unit.y;
    data[writeOffset + 2] = offsetValue;
    data[writeOffset + 3] = 1; // kind = line
}

function normalize(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / len, y: v.y / len };
}

function clearRemainder(buffers: GeodesicUniformBuffers, startIndex: number): void {
    const offset = startIndex * COMPONENTS_PER_VEC4;
    if (offset >= buffers.data.length) return;
    buffers.data.fill(0, offset);
}
