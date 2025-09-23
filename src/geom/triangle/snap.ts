const DEFAULT_MIN = 2;
const DEFAULT_MAX = 200;
const HYPERBOLIC_EPS = 1e-12;

export type PqrKey = "p" | "q" | "r";

export type TriangleTriple = Record<PqrKey, number>;

export type SnapParameterOptions = {
    nMin?: number;
    nMax?: number;
};

export type SnapTriangleOptions = {
    nMin?: number;
    nMax?: number;
    locked?: Partial<Record<PqrKey, boolean>>;
};

export function snapParameterToPiOverN(value: number, options?: SnapParameterOptions): number {
    const nMin = Math.max(DEFAULT_MIN, Math.floor(options?.nMin ?? DEFAULT_MIN));
    const nMax = Math.max(nMin, Math.floor(options?.nMax ?? DEFAULT_MAX));
    if (!Number.isFinite(value) || value <= 0) {
        return nMin;
    }
    const clamped = Math.min(Math.max(value, nMin), nMax);
    const theta = Math.PI / clamped;

    let bestN = nMin;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let n = nMin; n <= nMax; n += 1) {
        const candidateTheta = Math.PI / n;
        const diff = Math.abs(candidateTheta - theta);
        if (diff + HYPERBOLIC_EPS < bestDiff) {
            bestDiff = diff;
            bestN = n;
            continue;
        }
        if (Math.abs(diff - bestDiff) <= HYPERBOLIC_EPS && n < bestN) {
            bestN = n;
        }
    }
    return bestN;
}

export const DEFAULT_PI_OVER_N_MAX = DEFAULT_MAX;
export const HYPERBOLIC_THRESHOLD = 1 - HYPERBOLIC_EPS;

export function snapTriangleParams(
    values: TriangleTriple,
    options?: SnapTriangleOptions,
): TriangleTriple {
    const nMin = Math.max(DEFAULT_MIN, Math.floor(options?.nMin ?? DEFAULT_MIN));
    const nMax = Math.max(nMin, Math.floor(options?.nMax ?? DEFAULT_MAX));
    const locked = options?.locked ?? {};

    const snapped: TriangleTriple = {
        p: snapParameterToPiOverN(values.p, { nMin, nMax }),
        q: snapParameterToPiOverN(values.q, { nMin, nMax }),
        r: snapParameterToPiOverN(values.r, { nMin, nMax }),
    };

    const adjustable = (Object.keys(snapped) as PqrKey[]).filter((key) => !locked[key]);
    if (adjustable.length === 0) {
        return snapped;
    }

    let sum = hyperbolicSum(snapped);
    while (sum >= HYPERBOLIC_THRESHOLD) {
        const key = nextAdjustableKey(snapped, adjustable, nMax);
        if (!key) break;
        snapped[key] += 1;
        sum = hyperbolicSum(snapped);
    }

    return snapped;
}

function hyperbolicSum(triple: TriangleTriple): number {
    return 1 / triple.p + 1 / triple.q + 1 / triple.r;
}

function nextAdjustableKey(
    triple: TriangleTriple,
    adjustable: PqrKey[],
    max: number,
): PqrKey | null {
    if (adjustable.includes("r") && triple.r < max) {
        return "r";
    }
    let candidate: PqrKey | null = null;
    for (const key of adjustable) {
        if (triple[key] >= max) continue;
        if (!candidate || triple[key] < triple[candidate]) {
            candidate = key;
        }
    }
    return candidate;
}
