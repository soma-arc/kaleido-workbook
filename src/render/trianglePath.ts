/*
 * Triangle path specification (Issue #77)
 * Parent: #75  Epic: #56
 */
import type { Vec2 } from "@/geom/core/types";

export interface LineSegmentSpec {
    kind: "line";
    a: Vec2;
    b: Vec2;
    // Optional hyperbolic length (future use for sorting / culling heuristics)
    hLength?: number;
}

export interface ArcSegmentSpec {
    kind: "arc";
    a: Vec2; // start point
    b: Vec2; // end point
    center: Vec2; // Euclidean center of supporting circle
    radius: number; // Euclidean radius (< 1 for interior arcs that are not boundary)
    ccw: boolean; // true if arc goes counter‑clockwise from a to b
    hLength?: number;
}

export type GeodesicSegmentSpec = LineSegmentSpec | ArcSegmentSpec;

export interface TrianglePathSpec {
    kind: "triangle-path";
    // Ordered CCW segments (3). Each segment.a must equal previous segment.b (with eps tolerance handled externally)
    segments: [GeodesicSegmentSpec, GeodesicSegmentSpec, GeodesicSegmentSpec];
    // Barycenter (Euclidean) cached for stable ordering
    barycenter: Vec2;
    // Original face index or hash (if derivable); optional for now
    faceId?: number | string;
}

// Construction options (may expand later)
export interface BuildTrianglePathOptions {
    ensureCCW?: boolean; // default true
    computeHyperbolicLengths?: boolean; // default false
}

// Epsilon for vector equality / orientation checks
const EPS = 1e-12;

// Helper: approximate barycenter of 3 points
function barycenter3(a: Vec2, b: Vec2, c: Vec2): Vec2 {
    return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
}

// Placeholder: in future we may inject hyperbolic length computation
function maybeComputeLength(seg: GeodesicSegmentSpec, _opts: BuildTrianglePathOptions): void {
    if (!("hLength" in seg) || seg.hLength != null) return;
    // TODO: implement hyperbolic length if requested
}

export function buildTrianglePath(
    segments: [GeodesicSegmentSpec, GeodesicSegmentSpec, GeodesicSegmentSpec],
    opts: BuildTrianglePathOptions = {},
): TrianglePathSpec {
    const { ensureCCW = true, computeHyperbolicLengths = false } = opts;

    // Basic validation: connectivity
    // NOTE: real epsilon/normalization is deferred to calling adapter; here we do minimal checks
    if (segments.length !== 3) throw new Error("TrianglePath requires exactly 3 segments");

    // Extract points
    const p0 = segments[0].a;
    const p1 = segments[0].b;
    const p2 = segments[1].b; // assuming connectivity a->b, b->c, c->a

    const bc = barycenter3(p0, p1, p2);

    // Orientation (signed area *2)
    const area2 = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    let orientedSegments = segments;
    if (ensureCCW && area2 < -EPS) {
        // Swap second & third segment to flip orientation (simple heuristic)
        orientedSegments = [segments[0], segments[2], segments[1]];
    }

    if (computeHyperbolicLengths) {
        for (const s of orientedSegments) maybeComputeLength(s, opts);
    }

    return {
        kind: "triangle-path",
        segments: orientedSegments,
        barycenter: bc,
    };
}
