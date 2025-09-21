import type { CircleSpec, LineSpec } from "../primitives";
import type { TileScene } from "../scene";

export const MAX_UNIFORM_GEODESICS = 256;
const COMPONENTS_PER_VEC4 = 4;

export type GeodesicUniformBuffers = {
    dataA: Float32Array;
    dataB: Float32Array;
};

export function createGeodesicUniformBuffers(
    limit: number = MAX_UNIFORM_GEODESICS,
): GeodesicUniformBuffers {
    const size = Math.max(0, limit | 0) * COMPONENTS_PER_VEC4;
    return {
        dataA: new Float32Array(size),
        dataB: new Float32Array(size),
    };
}

export function packSceneGeodesics(
    scene: TileScene,
    buffers: GeodesicUniformBuffers,
    limit: number = MAX_UNIFORM_GEODESICS,
): number {
    const maxCount = Math.min(limit, buffers.dataA.length / COMPONENTS_PER_VEC4);
    let count = 0;
    for (const primitive of scene.tiles) {
        if (count >= maxCount) break;
        if (primitive.kind === "circle") {
            packCircle(primitive.circle, buffers, count);
        } else {
            packLine(primitive.line, buffers, count);
        }
        count += 1;
    }
    clearRemainder(buffers, count);
    return count;
}

function packCircle(circle: CircleSpec, buffers: GeodesicUniformBuffers, index: number): void {
    const offset = index * COMPONENTS_PER_VEC4;
    const { dataA, dataB } = buffers;
    dataA[offset + 0] = circle.cx;
    dataA[offset + 1] = circle.cy;
    dataA[offset + 2] = circle.r;
    dataA[offset + 3] = 0; // kind = circle
    dataB[offset + 0] = 0;
    dataB[offset + 1] = 0;
    dataB[offset + 2] = 0;
    dataB[offset + 3] = 0;
}

function packLine(line: LineSpec, buffers: GeodesicUniformBuffers, index: number): void {
    const offset = index * COMPONENTS_PER_VEC4;
    const { dataA, dataB } = buffers;
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;
    dataA[offset + 0] = line.x1;
    dataA[offset + 1] = line.y1;
    dataA[offset + 2] = dirX;
    dataA[offset + 3] = 1; // kind = line
    dataB[offset + 0] = dirY;
    dataB[offset + 1] = 0;
    dataB[offset + 2] = 0;
    dataB[offset + 3] = 0;
}

function clearRemainder(buffers: GeodesicUniformBuffers, startIndex: number): void {
    const offset = startIndex * COMPONENTS_PER_VEC4;
    if (offset >= buffers.dataA.length) return;
    buffers.dataA.fill(0, offset);
    buffers.dataB.fill(0, offset);
}
