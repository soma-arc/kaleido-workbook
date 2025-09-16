# Triangle Polygon Rendering Requirements (Issue #76)

Status: draft
Parent: #75  / Epic: #56
Related: #77 (API/Spec), #78 (Tests), #79 (Implementation)

## Goals
Render closed hyperbolic triangle faces (TriangleFace) as stable stroked polygonal paths (initially stroke only) instead of individual geodesic edges.

## In Scope
- Deterministic path construction (3 ordered segments) per TriangleFace
- Segment kinds: line | arc (geodesic circle-arc) with explicit center/radius/orientation
- Canonical winding (counter‑clockwise in Euclidean embedding of Poincaré disk)
- Stable sort order for rendering (tie-break: barycenter.x,y then average hyperbolic radius)
- Minimal culling: off‑viewport & sub‑pixel (configurable threshold)
- Canvas 2D stroke style defaults (lineWidth=1, lineJoin="miter", lineCap="butt")

## Out of Scope
- Fill, gradients, WebGL/WebGPU, antialias tuning
- Advanced batching / spatial index acceleration
- Self‑intersection diagnostics (faces assumed valid)

## Determinism & Ordering
- Input order of faces must not affect final rendered z‑order (after sort)
- Segment point order: vertices A->B->C->A (A chosen by lexicographic (x,y) minimum of the three Euclidean coordinates)
- Arc direction chosen so interior lies to the left when traversing path

## Winding Rule
Counter‑clockwise (CCW) in Euclidean disk. If constructed path is CW, swap last two vertices (B,C) to reorient.

## Segment Specification (preview)
```
LineSegmentSpec { kind:"line", a:Vec2, b:Vec2 }
ArcSegmentSpec  { kind:"arc",  a:Vec2, b:Vec2, center:Vec2, radius:number, ccw:boolean }
```
(All coordinates in disk coords; precision: double, no rounding until raster stage.)

## Culling
- Viewport exclusion: all segment endpoints outside disk + bounding circle fully outside canvas -> cull
- Sub‑pixel: estimated on‑screen perimeter < MIN_PX (default 2) -> cull

## Numerical Considerations
- Tolerance eps = 1e-12 for orientation / CCW checks
- Avoid repeated atan2: precompute angles when deriving arc
- Arc splitting not required yet (single arc per geodesic edge)

## Invariants (for property tests)
1. Each vertex lies strictly inside unit disk (|p| < 1 - 1e-12)
2. Reconstructed geodesic edges pass through the three original TriangleFace vertices
3. Rotation / translation (Mobius isometry) invariance of classification (kind, ordering)
4. Input face list permutation does not change rendered segment multiset
5. Winding always CCW

## Open Questions (to resolve before #77 finalizes API)
- Should we expose hyperbolic edge length on segments for later heuristics? (Tentative: yes, optional field `hLength?: number`)
- Do we need per‑face id hashing for stable diffing? (Tentative: defer; derive from sorted vertex tuple)

## DoD (Issue #76)
- Requirements document (this file) committed
- Any open questions resolved or moved to #77 comment thread
- No code changes beyond docs for this issue

---
Appendix changes after review will update this file (versioned via git history).
