# Done Checklist (per task)

- All tests green relevant to changes: acceptance (unchanged), unit, property (seed fixed when applicable)
- Types pass: `pnpm typecheck`
- Code style passes: `pnpm lint` and `pnpm format --check`
- API/contract preserved: `circleCircleIntersection` signature and output ordering/classification unchanged unless coordinated change
- Documentation updated if needed: README/AGENTS/TODO remain consistent with TDD policy
- Small, focused commit with clear message and scope
