import type { Geodesic } from "../geom/geodesic";
import { geodesicThroughPoints } from "../geom/geodesic";
import type { TriangleFace } from "../geom/triangle-group";

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
