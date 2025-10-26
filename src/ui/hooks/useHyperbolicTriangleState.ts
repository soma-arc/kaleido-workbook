import { useCallback, useMemo, useState } from "react";
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
};

export function useHyperbolicTriangleState(
    options: UseHyperbolicTriangleStateOptions,
): HyperbolicTriangleState {
    const { initialParams, triangleNMax, depthRange } = options;
    const [params, setParams] = useState<TilingParams>({ ...initialParams });
    const [snapEnabled, setSnapEnabledState] = useState(true);

    const rRange = useMemo(() => {
        const minR = computeHyperbolicMinR(params.p, params.q);
        return {
            min: Math.max(MIN_TRIANGLE_PARAM, Math.min(minR, triangleNMax)),
            max: Math.max(MIN_TRIANGLE_PARAM, triangleNMax),
        };
    }, [params.p, params.q, triangleNMax]);

    const rSliderValue = params.r;
    const rStep = snapEnabled ? 1 : 0.1;

    const setSnapEnabled = useCallback((enabled: boolean) => {
        setSnapEnabledState(enabled);
    }, []);

    const applyDirectTriple = useCallback(
        (triple: TriangleTriple) => {
            const clamped = clampHyperbolicTriple(triple, triangleNMax);
            setParams((prev) => {
                if (prev.p === clamped.p && prev.q === clamped.q && prev.r === clamped.r) {
                    return prev;
                }
                return { ...prev, ...clamped };
            });
        },
        [triangleNMax],
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

    return {
        params,
        snapEnabled,
        setSnapEnabled,
        rRange,
        rSliderValue,
        rStep,
        applyDirectTriple,
        updateDepth,
    };
}

function clampHyperbolicTriple(triple: TriangleTriple, triangleNMax: number): TriangleTriple {
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
    const candidateR = clampValue(triple.r);
    const clampedR = Math.max(candidateR, hyperbolicSafeMin);
    const r = Math.min(clampedR, triangleNMax);

    return { p, q, r };
}

function computeHyperbolicMinR(p: number, q: number): number {
    const margin = 1 - 1 / p - 1 / q;
    if (margin <= HYPERBOLIC_MARGIN_EPS) {
        return MIN_TRIANGLE_PARAM + 1;
    }
    const theoreticalMinimum = 1 / margin;
    return Math.max(MIN_TRIANGLE_PARAM, theoreticalMinimum);
}
