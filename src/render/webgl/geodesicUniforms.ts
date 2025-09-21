import type { Geodesic } from "../../geom/geodesic";
import type { TileScene } from "../scene";

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
    scene: TileScene,
    buffers: GeodesicUniformBuffers,
    limit: number = MAX_UNIFORM_GEODESICS,
): number {
    const maxCount = Math.min(limit, buffers.data.length / COMPONENTS_PER_VEC4);
    let count = 0;
    for (const primitive of scene.tiles) {
        if (count >= maxCount) break;
        if (primitive.geodesic.kind === "circle") {
            packCircleGeodesic(primitive.geodesic, buffers, count);
        } else {
            packDiameterGeodesic(primitive.geodesic, buffers, count);
        }
        count += 1;
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
    const offset = index * COMPONENTS_PER_VEC4;
    const data = buffers.data;
    data[offset + 0] = geo.dir.x;
    data[offset + 1] = geo.dir.y;
    data[offset + 2] = 0;
    data[offset + 3] = 1; // kind = line
}

function clearRemainder(buffers: GeodesicUniformBuffers, startIndex: number): void {
    const offset = startIndex * COMPONENTS_PER_VEC4;
    if (offset >= buffers.data.length) return;
    buffers.data.fill(0, offset);
}
