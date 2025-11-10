import { useCallback, useMemo, useRef, useState } from "react";
import { normalizeDepth } from "@/geom/triangle/params";
import type { TriangleTriple } from "@/geom/triangle/snap";
import type { TilingParams } from "@/geom/triangle/tiling";

const MIN_TRIANGLE_PARAM = 2;
const HYPERBOLIC_MARGIN_EPS = 1e-6;
const HYPERBOLIC_MIN_OFFSET = 1e-6;

export type UseHyperbolicTriangleStateOptions = {
    initialParams: TilingParams;
    triangleNMax: number;
    depthRange: { min: number; max: number };
    allowIdeal?: boolean;
};

export type HyperbolicTriangleState = {
    params: TilingParams;
    snapEnabled: boolean;
    setSnapEnabled: (enabled: boolean) => void;
    rRange: { min: number; max: number };
    rSliderValue: number;
    rStep: number;
    applyDirectTriple: (triple: TriangleTriple) => void;
    updateDepth: (value: number) => void;
    idealVertexEnabled: boolean;
    setIdealVertex: (enabled: boolean) => void;
};

export function useHyperbolicTriangleState(
    options: UseHyperbolicTriangleStateOptions,
): HyperbolicTriangleState {
    const { initialParams, triangleNMax, allowIdeal = false } = options;
    const initialClampedR = clampHyperbolicTriple(initialParams, triangleNMax, allowIdeal).r;
    const [params, setParams] = useState<TilingParams>({ ...initialParams, r: initialClampedR });
    const [snapEnabled, setSnapEnabledState] = useState(true);
    const lastFiniteRRef = useRef<number>(
        Number.isFinite(initialClampedR)
            ? initialClampedR
            : computeHyperbolicMinR(initialParams.p, initialParams.q) + 1,
    );

    const rRange = useMemo(() => {
        const minR = computeHyperbolicMinR(params.p, params.q);
        return {
            min: Math.max(MIN_TRIANGLE_PARAM, Math.min(minR, triangleNMax)),
            max: Math.max(MIN_TRIANGLE_PARAM, triangleNMax),
        };
    }, [params.p, params.q, triangleNMax]);

    const rSliderValue = Number.isFinite(params.r)
        ? params.r
        : clampToRange(lastFiniteRRef.current, rRange.min, rRange.max);
    const rStep = snapEnabled ? 1 : 0.1;

    const setSnapEnabled = useCallback((enabled: boolean) => {
        setSnapEnabledState(enabled);
    }, []);

    const applyDirectTriple = useCallback(
        (triple: TriangleTriple) => {
            const clamped = clampHyperbolicTriple(triple, triangleNMax, allowIdeal);
            setParams((prev) => {
                if (prev.p === clamped.p && prev.q === clamped.q && prev.r === clamped.r) {
                    return prev;
                }
                return { ...prev, ...clamped };
            });
            if (Number.isFinite(clamped.r)) {
                lastFiniteRRef.current = clamped.r;
            }
        },
        [triangleNMax, allowIdeal],
    );

    const updateDepth = useCallback((value: number) => {
        setParams((prev) => {
            const nextDepth = normalizeDepth(value);
            if (prev.depth === nextDepth) {
                return prev;
            }
            return { ...prev, depth: nextDepth };
        });
    }, []);

    const setIdealVertex = useCallback(
        (enabled: boolean) => {
            if (!allowIdeal) {
                return;
            }
            setParams((prev) => {
                if (enabled) {
                    if (Number.isFinite(prev.r)) {
                        lastFiniteRRef.current = prev.r;
                    }
                    if (!Number.isFinite(prev.r)) {
                        return prev;
                    }
                    return { ...prev, r: Number.POSITIVE_INFINITY };
                }
                if (Number.isFinite(prev.r)) {
                    return prev;
                }
                const restored = restoreFiniteRValue(
                    prev.p,
                    prev.q,
                    triangleNMax,
                    lastFiniteRRef.current,
                );
                return { ...prev, r: restored };
            });
        },
        [allowIdeal, triangleNMax],
    );

    return {
        params,
        snapEnabled,
        setSnapEnabled,
        rRange,
        rSliderValue,
        rStep,
        applyDirectTriple,
        updateDepth,
        idealVertexEnabled: !Number.isFinite(params.r),
        setIdealVertex,
    };
}

function clampHyperbolicTriple(
    triple: TriangleTriple,
    triangleNMax: number,
    allowIdeal: boolean,
): TriangleTriple {
    const clampValue = (value: number): number => {
        if (!Number.isFinite(value)) {
            return MIN_TRIANGLE_PARAM;
        }
        return Math.min(Math.max(value, MIN_TRIANGLE_PARAM), triangleNMax);
    };

    const p = clampValue(triple.p);
    const q = clampValue(triple.q);
    const minR = computeHyperbolicMinR(p, q);
    const hyperbolicSafeMin = minR + HYPERBOLIC_MIN_OFFSET;
    if (allowIdeal && !Number.isFinite(triple.r)) {
        return { p, q, r: Number.POSITIVE_INFINITY };
    }
    const candidateR = clampValue(triple.r);
    const clampedR = Math.max(candidateR, hyperbolicSafeMin);
    const r = Math.min(clampedR, triangleNMax);

    return { p, q, r };
}

function restoreFiniteRValue(
    p: number,
    q: number,
    triangleNMax: number,
    candidate: number | undefined,
): number {
    const minAllowed = computeHyperbolicMinR(p, q) + HYPERBOLIC_MIN_OFFSET;
    if (Number.isFinite(candidate ?? NaN)) {
        return clampToRange(candidate as number, minAllowed, triangleNMax);
    }
    const fallback = minAllowed + 1;
    return Math.min(Math.max(fallback, minAllowed), triangleNMax);
}

function clampToRange(value: number, min: number, max: number): number {
    const safeMin = Number.isFinite(min) ? min : MIN_TRIANGLE_PARAM;
    const safeMax = Number.isFinite(max) ? max : Math.max(safeMin + 1, MIN_TRIANGLE_PARAM + 1);
    return Math.min(Math.max(value, safeMin), safeMax);
}

function computeHyperbolicMinR(p: number, q: number): number {
    const margin = 1 - 1 / p - 1 / q;
    if (margin <= HYPERBOLIC_MARGIN_EPS) {
        return MIN_TRIANGLE_PARAM + 1;
    }
    const theoreticalMinimum = 1 / margin;
    return Math.max(MIN_TRIANGLE_PARAM, theoreticalMinimum);
}
