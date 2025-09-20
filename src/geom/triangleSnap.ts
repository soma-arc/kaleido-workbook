const DEFAULT_MIN = 2;
const DEFAULT_MAX = 200;
const EPS = 1e-12;

export type SnapParameterOptions = {
    nMin?: number;
    nMax?: number;
};

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
