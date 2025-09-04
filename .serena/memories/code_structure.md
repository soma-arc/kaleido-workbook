# Code Structure (planned)

- `src/` — application and geometry code
  - `geom/` — Geometry Core (e.g., `types.ts`, `circle.ts`)
  - other app folders (engine, ui, etc.) come after Geometry Core is stable
- `tests/` — tests (TDD policy)
  - `acceptance/` — human-authored, locked
  - `unit/` — mirrors relevant `src/**` areas
  - `property/` — property-based tests (fast-check)
  - `integration/` — optional integration tests if needed
  - `fixtures/` — sample inputs/expected values
- Root config files (planned): `vitest.config.ts`, `biome.json`, `tsconfig.json`, `vite.config.ts`, `.github/workflows/ci.yml`
