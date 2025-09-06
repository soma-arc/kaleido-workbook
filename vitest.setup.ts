import fc from "fast-check";

// Global property-based testing defaults
// Keep seeds fixed for reproducibility; adjust via env if needed.
const SEED = Number(process.env.FC_SEED ?? 424242);
const NUM_RUNS = Number(process.env.FC_RUNS ?? 200);

fc.configureGlobal({ seed: SEED, numRuns: NUM_RUNS });

