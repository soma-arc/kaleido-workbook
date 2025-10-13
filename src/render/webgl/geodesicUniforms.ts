import { GEOMETRY_KIND } from "@/geom/core/types";
import { GEODESIC_KIND } from "@/geom/primitives/geodesic";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import {
    normalizeOrientedGeodesic,
    type OrientedCircle,
    type OrientedGeodesic,
    type OrientedLine,
} from "@/geom/primitives/orientedGeodesic";
import type { RenderScene } from "../scene";

export const MAX_UNIFORM_GEODESICS = 256;
const COMPONENTS_PER_VEC4 = 4;

export const GEODESIC_KIND_CIRCLE = 0;
export const GEODESIC_KIND_LINE = 1;

export type GeodesicUniformBuffers = {
    data: Float32Array;
    kinds: Int32Array;
};

export function createGeodesicUniformBuffers(
    limit: number = MAX_UNIFORM_GEODESICS,
): GeodesicUniformBuffers {
    const size = Math.max(0, limit | 0) * COMPONENTS_PER_VEC4;
    return {
        data: new Float32Array(size),
        kinds: new Int32Array(Math.max(0, limit | 0)),
    };
}

export function packSceneGeodesics(
    scene: RenderScene,
    buffers: GeodesicUniformBuffers,
    limit: number = MAX_UNIFORM_GEODESICS,
): number {
    const maxCount = Math.min(limit, buffers.data.length / COMPONENTS_PER_VEC4);
    let count = 0;
    if (scene.geometry === GEOMETRY_KIND.hyperbolic) {
        const geodesics = scene.renderGeodesics ?? [];
        for (const geodesic of geodesics) {
            if (count >= maxCount) break;
            packOrientedGeodesic(geodesic, buffers, count);
            count += 1;
        }
    } else if (scene.geometry === GEOMETRY_KIND.euclidean) {
        for (const plane of scene.halfPlanes) {
            if (count >= maxCount) break;
            packSceneHalfPlane(plane, buffers, count);
            count += 1;
        }
    } else {
        count = 0;
    }
    clearRemainder(buffers, count);
    return count;
}

function packOrientedGeodesic(
    boundary: OrientedGeodesic,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const normalized = normalizeOrientedGeodesic(boundary);
    if (normalized.kind === "circle") {
        packOrientedCircle(normalized, buffers, index);
        return;
    }
    packOrientedLine(normalized, buffers, index);
}

function packSceneHalfPlane(
    plane: HalfPlane,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const unit = normalizeHalfPlane(plane);
    packLine(unit.normal, unit.anchor, buffers, index);
}

function packOrientedCircle(
    circle: OrientedCircle,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const offset = index * COMPONENTS_PER_VEC4;
    const data = buffers.data;
    data[offset + 0] = circle.center.x;
    data[offset + 1] = circle.center.y;
    data[offset + 2] = circle.radius;
    data[offset + 3] = circle.orientation;
    buffers.kinds[index] = GEODESIC_KIND_CIRCLE;
}

function packOrientedLine(
    line: OrientedLine,
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    packLine(line.normal, line.anchor, buffers, index);
}

function packLine(
    normal: { x: number; y: number },
    anchor: { x: number; y: number },
    buffers: GeodesicUniformBuffers,
    index: number,
): void {
    const unit = normalize(normal);
    const writeOffset = index * COMPONENTS_PER_VEC4;
    const data = buffers.data;
    data[writeOffset + 0] = unit.x;
    data[writeOffset + 1] = unit.y;
    data[writeOffset + 2] = anchor.x;
    data[writeOffset + 3] = anchor.y;
    buffers.kinds[index] = GEODESIC_KIND_LINE;
}

function normalize(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / len, y: v.y / len };
}

function clearRemainder(buffers: GeodesicUniformBuffers, startIndex: number): void {
    const offset = startIndex * COMPONENTS_PER_VEC4;
    if (offset >= buffers.data.length) return;
    buffers.data.fill(0, offset);
    if (startIndex < buffers.kinds.length) {
        buffers.kinds.fill(0, startIndex);
    }
}
