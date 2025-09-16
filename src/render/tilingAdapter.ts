import type { Geodesic } from "../geom/geodesic";
import { geodesicThroughPoints } from "../geom/geodesic";
import type { TriangleFace } from "../geom/triangle-group";
import type { GeodesicSegmentSpec, TrianglePathSpec } from "./trianglePath";
import { buildTrianglePath } from "./trianglePath";

export type FaceEdge = {
    faceId: string;
    faceWord: string;
    edgeIndex: 0 | 1 | 2;
    geodesic: Geodesic;
};

/**
 * Convert faces into an ordered list of geodesic edges.
 * Ordering:
 *  - Faces are sorted by word length, then lexicographically (same as expandTriangleGroup)
 *  - Within each face, edges are emitted in index order 0,1,2 defined by consecutive vertex pairs
 */
export function facesToEdgeGeodesics(faces: TriangleFace[]): FaceEdge[] {
    const order = [...faces].sort(
        (a, b) => a.word.length - b.word.length || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0),
    );
    const out: FaceEdge[] = [];
    for (const f of order) {
        const v = f.verts;
        const pairs: [number, number, 0 | 1 | 2][] = [
            [0, 1, 0],
            [1, 2, 1],
            [2, 0, 2],
        ];
        for (const [i, j, k] of pairs) {
            const g = geodesicThroughPoints(v[i], v[j]);
            out.push({ faceId: f.id, faceWord: f.word, edgeIndex: k, geodesic: g });
        }
    }
    return out;
}

/**
 * Convert faces to TrianglePathSpec list, preserving stable ordering identical to faces array order.
 * For now all edges are treated as straight line geodesic segments (Issue #79 scope: minimal wiring).
 * Future: detect circular geodesics and generate ArcSegmentSpec.
 */
export function facesToTrianglePaths(faces: TriangleFace[]): TrianglePathSpec[] {
    const out: TrianglePathSpec[] = [];
    for (const f of faces) {
        const [v0, v1, v2] = f.verts;
        const segs: [GeodesicSegmentSpec, GeodesicSegmentSpec, GeodesicSegmentSpec] = [
            { kind: "line", a: v0, b: v1 },
            { kind: "line", a: v1, b: v2 },
            { kind: "line", a: v2, b: v0 },
        ];
        const tri = buildTrianglePath(segs, { ensureCCW: true });
        tri.faceId = f.id;
        out.push(tri);
    }
    return out;
}

/**
 * Filter + stable order triangle paths.
 * Ordering: by barycenter.x then barycenter.y (ties fallback to faceId string compare)
 * Culling: drop triangles whose AABB is entirely outside unit disk bounds (coarse heuristic) or whose
 *          max side length (Euclidean) is below minSize (default extremely small to keep all).
 */
export function orderAndCullTrianglePaths(
    faces: TriangleFace[],
    opts: { minSize?: number } = {},
): TrianglePathSpec[] {
    const { minSize = 0 } = opts;
    const tris = facesToTrianglePaths(faces);
    const filtered: TrianglePathSpec[] = [];
    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        // Quick size heuristic using segment lengths
        const segLens = t.segments.map((s) => {
            const dx = s.b.x - s.a.x;
            const dy = s.b.y - s.a.y;
            return Math.hypot(dx, dy);
        });
        const maxLen = Math.max(...segLens);
        if (maxLen < minSize) continue;
        // Rough unit disk cull (barycenter outside plus all verts outside could refine, but minimal now)
        const bc = t.barycenter;
        if (bc.x * bc.x + bc.y * bc.y > 1.05 * 1.05) continue; // small margin
        filtered.push(t);
    }
    filtered.sort(
        (a, b) =>
            a.barycenter.x - b.barycenter.x ||
            a.barycenter.y - b.barycenter.y ||
            `${a.faceId ?? ""}`.localeCompare(`${b.faceId ?? ""}`),
    );
    return filtered;
}
