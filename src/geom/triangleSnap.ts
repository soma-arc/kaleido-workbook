const DEFAULT_MIN = 2;
const DEFAULT_MAX = 200;
const EPS = 1e-12;

export type SnapParameterOptions = {
    nMin?: number;
    nMax?: number;
};

export type PqrKey = "p" | "q" | "r";

export type TriangleTriple = Record<PqrKey, number>;

export type SnapTriangleOptions = {
    nMax?: number;
    locked?: Partial<Record<PqrKey, boolean>>;
};

const HYPERBOLIC_EPS = 1e-12;

/**
 * Snap a parameter interpreted as π/denominator to the nearest π/n grid.
 * Returns the denominator n within [nMin, nMax], preferring the smaller n when ties occur.
 */
export function snapParameterToPiOverN(value: number, options?: SnapParameterOptions): number {
    const nMin = Math.max(DEFAULT_MIN, Math.floor(options?.nMin ?? DEFAULT_MIN));
    const nMax = Math.max(nMin, Math.floor(options?.nMax ?? DEFAULT_MAX));
    if (!Number.isFinite(value) || value <= 0) {
        return nMin;
    }
    // Clamp raw denominator into search interval before converting to angle.
    const clamped = Math.min(Math.max(value, nMin), nMax);
    const theta = Math.PI / clamped;

    let bestN = nMin;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let n = nMin; n <= nMax; n += 1) {
        const candidateTheta = Math.PI / n;
        const diff = Math.abs(candidateTheta - theta);
        if (diff + EPS < bestDiff) {
            bestDiff = diff;
            bestN = n;
            continue;
        }
        if (Math.abs(diff - bestDiff) <= EPS && n < bestN) {
            bestN = n;
        }
    }
    return bestN;
}

export const DEFAULT_PI_OVER_N_MAX = DEFAULT_MAX;

const PQR_KEYS: readonly PqrKey[] = ["p", "q", "r"] as const;

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

export function snapTriangleParams(
    values: TriangleTriple,
    options?: SnapTriangleOptions,
): TriangleTriple {
    const nMax = Math.max(DEFAULT_MIN, Math.floor(options?.nMax ?? DEFAULT_MAX));
    const locked = options?.locked ?? {};

    const snapped: TriangleTriple = {
        p: snapParameterToPiOverN(values.p, { nMax }),
        q: snapParameterToPiOverN(values.q, { nMax }),
        r: snapParameterToPiOverN(values.r, { nMax }),
    };

    const adjustable = PQR_KEYS.filter((key) => !locked[key]);
    if (adjustable.length === 0) {
        return snapped;
    }

    let sum = hyperbolicSum(snapped);
    // Increase denominators until we cross into the hyperbolic region or adjustments are exhausted.
    while (sum >= 1 - HYPERBOLIC_EPS) {
        const key = nextAdjustableKey(snapped, adjustable, nMax);
        if (!key) break;
        snapped[key] += 1;
        sum = hyperbolicSum(snapped);
    }

    return snapped;
}

export const HYPERBOLIC_THRESHOLD = 1 - HYPERBOLIC_EPS;
