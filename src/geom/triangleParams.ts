export type HyperbolicTriangleParams = {
    p: number;
    q: number;
    r: number;
};

export type TriangleParamsValidation = { ok: true } | { ok: false; errors: string[] };

export type TriangleValidationOptions = {
    requireIntegers?: boolean;
};

const MIN_VALUE = 2;
const EPSILON = 1e-12;
const DEPTH_MIN = 0;
const DEPTH_MAX = 10;

export function validateTriangleParams(
    params: HyperbolicTriangleParams,
    options?: TriangleValidationOptions,
): TriangleParamsValidation {
    const errors: string[] = [];
    const requireIntegers = options?.requireIntegers !== false;

    (["p", "q", "r"] as const).forEach((key) => {
        const value = params[key];
        if (!Number.isFinite(value) || value < MIN_VALUE) {
            errors.push(`${key} must be a number >= ${MIN_VALUE}`);
            return;
        }
        if (requireIntegers && !Number.isInteger(value)) {
            errors.push(`${key} must be an integer >= ${MIN_VALUE}`);
        }
    });

    if (errors.length === 0) {
        const sum = 1 / params.p + 1 / params.q + 1 / params.r;
        if (!(sum < 1 - EPSILON)) {
            errors.push("1/p + 1/q + 1/r must be < 1");
        }
    }

    if (errors.length > 0) {
        return { ok: false, errors };
    }

    return { ok: true };
}

export function normalizeDepth(value: number): number {
    if (!Number.isFinite(value)) {
        return DEPTH_MIN;
    }
    const rounded = Math.round(value);
    if (rounded < DEPTH_MIN) return DEPTH_MIN;
    if (rounded > DEPTH_MAX) return DEPTH_MAX;
    return rounded;
}
