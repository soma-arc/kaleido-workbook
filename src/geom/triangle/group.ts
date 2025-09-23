import type { GeometryKind, Vec2 } from "@/geom/core/types";
import { reflectAcrossHalfPlane } from "@/geom/primitives/halfPlane";
import { reflectAcrossGeodesic, type Transform2D } from "@/geom/transforms/reflect";
import type {
    EuclideanTrianglePrimitives,
    HyperbolicTrianglePrimitives,
    TrianglePrimitiveSet,
} from "@/geom/triangle/types";

export type TriangleFace = {
    id: string;
    verts: [Vec2, Vec2, Vec2];
    aabb: { min: Vec2; max: Vec2 };
    word: string;
};

function aabbOf(verts: [Vec2, Vec2, Vec2]) {
    const xs = verts.map((v) => v.x);
    const ys = verts.map((v) => v.y);
    return {
        min: { x: Math.min(...xs), y: Math.min(...ys) },
        max: { x: Math.max(...xs), y: Math.max(...ys) },
    };
}

function bary(verts: [Vec2, Vec2, Vec2]): Vec2 {
    return {
        x: (verts[0].x + verts[1].x + verts[2].x) / 3,
        y: (verts[0].y + verts[1].y + verts[2].y) / 3,
    };
}

function qkey(p: Vec2, q = 1e-9): string {
    const qx = Math.round(p.x / q);
    const qy = Math.round(p.y / q);
    return `${qx}:${qy}`;
}

function applyTransform<M>(
    verts: [Vec2, Vec2, Vec2],
    mirrors: [M, M, M],
    idx: 0 | 1 | 2,
    reflector: (mirror: M) => Transform2D,
): [Vec2, Vec2, Vec2] {
    const R = reflector(mirrors[idx]);
    return [R(verts[0]), R(verts[1]), R(verts[2])];
}

export function expandTriangleGroup<M, K extends GeometryKind>(
    base: TrianglePrimitiveSet<M, K>,
    depth: number,
    reflector: (mirror: M) => Transform2D,
    opts?: { maxFaces?: number },
) {
    const mirrors = base.mirrors;
    const faces: TriangleFace[] = [];
    const seen = new Set<string>();
    const queue: { verts: [Vec2, Vec2, Vec2]; word: string }[] = [];

    const pushFace = (verts: [Vec2, Vec2, Vec2], word: string) => {
        const k = qkey(bary(verts));
        if (seen.has(k)) return;
        seen.add(k);
        const id = `${word}|${k}`;
        faces.push({ id, verts, aabb: aabbOf(verts), word });
        queue.push({ verts, word });
    };

    pushFace(base.vertices, "");

    for (let d = 0; d < depth; d++) {
        const levelSize = queue.length;
        for (let i = 0; i < levelSize; i++) {
            const cur = queue.shift();
            if (!cur) continue;
            for (const j of [0, 1, 2] as const) {
                const w = cur.word + (j + 1).toString();
                const v = applyTransform(cur.verts as [Vec2, Vec2, Vec2], mirrors, j, reflector);
                pushFace(v, w);
                if (opts?.maxFaces && faces.length >= opts.maxFaces) break;
            }
        }
        if (opts?.maxFaces && faces.length >= opts.maxFaces) break;
    }

    // Stable order: by word length then lexicographic word, then id
    faces.sort(
        (a, b) =>
            a.word.length - b.word.length ||
            (a.word < b.word ? -1 : a.word > b.word ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );

    return {
        faces,
        stats: {
            depth,
            total: faces.length,
            duplicates: seen.size !== faces.length ? faces.length - seen.size : 0,
        },
    };
}

export function expandHyperbolicTriangleGroup(
    base: HyperbolicTrianglePrimitives,
    depth: number,
    opts?: { maxFaces?: number },
) {
    return expandTriangleGroup(base, depth, reflectAcrossGeodesic, opts);
}

export function expandEuclideanTriangleGroup(
    base: EuclideanTrianglePrimitives,
    depth: number,
    opts?: { maxFaces?: number },
) {
    return expandTriangleGroup(base, depth, reflectAcrossHalfPlane, opts);
}
