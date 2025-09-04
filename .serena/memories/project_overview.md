# Project Overview

- Purpose: Proof-of-concept app to explore hyperbolic geometry on the Poincaré disk (tri-reflection (p,q,r), geodesics, angle snap, group expansion, conjugation). For development, we prioritize a TDD-first Geometry Core (circle–circle intersection) before building the React/Canvas app.
- Tech stack: TypeScript + React + Vite + pnpm; Canvas 2D; Vitest (coverage provider: v8); Linter/Formatter: Biome (4-space indent); CI: GitHub Actions.
- Policy: TDD (Red → Green → Refactor). Acceptance tests are written by humans and locked. Agents contribute unit/property tests and implementation. 3-minute setup principle.
- Primary API (initial epic): `circleCircleIntersection(a: Circle, b: Circle): IntersectResult`.
  - `IntersectResult.kind`: `'none' | 'tangent' | 'two' | 'concentric' | 'coincident'`
  - `IntersectResult.points?`: 0/1/2 points. If 2 points, order is ascending by x then y (stable).
- OS: Linux environment.
