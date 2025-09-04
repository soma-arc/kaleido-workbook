# Style and Conventions

- TypeScript: `strict: true`.
- Lint/Format: Biome, 4-space indentation, semicolons enabled.
- Naming: lowerCamelCase (functions/variables), UpperCamelCase (types/components).
- Tests:
  - TDD: Red → Green → Refactor.
  - Acceptance tests under `tests/acceptance/**` are locked (agents must not modify).
  - Numeric comparisons: `toBeCloseTo(value, 12)` as baseline unless stricter specified.
  - Output contract: `kind` classification as enumerated; `points` sorted asc by x → y when two points.
- Commits: small, focused messages; suggested tags: `feat`, `fix`, `refactor`, `test`, `docs`, `chore` with scope (e.g., `geom(circle)`).
- 3-minute setup: `pnpm i && pnpm dev` should start quickly; keep changes incremental.
