import { useCallback, useEffect, useMemo, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import {
    normalizeDepth,
    validateEuclideanParams,
    validateTriangleParams,
} from "@/geom/triangle/params";
import { type PqrKey, snapTriangleParams, type TriangleTriple } from "@/geom/triangle/snap";
import type { TilingParams } from "@/geom/triangle/tiling";
import {
    DEFAULT_EUCLIDEAN_PRESET,
    DEFAULT_HYPERBOLIC_PRESET,
    type GeometryMode,
    type TrianglePreset,
} from "../trianglePresets";

export type { GeometryMode, TrianglePreset } from "../trianglePresets";

export type UseTriangleParamsOptions = {
    initialParams: TilingParams;
    triangleNMax: number;
    depthRange: { min: number; max: number };
    initialGeometryMode?: GeometryMode;
};

type FormInputs = Record<PqrKey, string>;

type TriangleAnchor = { p: number; q: number } | null;

export type UseTriangleParamsResult = {
    params: TilingParams;
    formInputs: FormInputs;
    anchor: TriangleAnchor;
    snapEnabled: boolean;
    paramError: string | null;
    paramWarning: string | null;
    rRange: { min: number; max: number };
    rSliderValue: number;
    rStep: number;
    depthRange: { min: number; max: number };
    geometryMode: GeometryMode;
    setParamInput: (key: PqrKey, value: string) => void;
    setFromPreset: (preset: TrianglePreset) => void;
    clearAnchor: () => void;
    setSnapEnabled: (enabled: boolean) => void;
    setRFromSlider: (value: number) => void;
    updateDepth: (value: number) => void;
    setGeometryMode: (mode: GeometryMode) => void;
    applyDirectTriple: (triple: TriangleTriple) => void;
};

export function useTriangleParams(options: UseTriangleParamsOptions): UseTriangleParamsResult {
    const { initialParams, triangleNMax, depthRange } = options;
    const [params, setParams] = useState<TilingParams>({ ...initialParams });
    const [formInputs, setFormInputs] = useState<FormInputs>(() => ({
        p: String(initialParams.p),
        q: String(initialParams.q),
        r: String(initialParams.r),
    }));
    const [anchor, setAnchor] = useState<TriangleAnchor>({
        p: initialParams.p,
        q: initialParams.q,
    });
    const [snapEnabled, setSnapEnabledState] = useState(true);
    const [paramError, setParamError] = useState<string | null>(null);
    const [paramWarning, setParamWarning] = useState<string | null>(null);
    const [preservePresetDisplay, setPreservePresetDisplay] = useState(false);
    const [geometryMode, setGeometryMode] = useState<GeometryMode>(
        options.initialGeometryMode ?? GEOMETRY_KIND.hyperbolic,
    );

    const rRange = useMemo(() => ({ min: 2, max: triangleNMax }), [triangleNMax]);

    const setParamInput = useCallback(
        (key: PqrKey, value: string) => {
            if (anchor && key !== "r") {
                return;
            }
            setFormInputs((prev) => {
                if (prev[key] === value) {
                    return prev;
                }
                return { ...prev, [key]: value };
            });
        },
        [anchor],
    );

    const setFromPreset = useCallback((preset: TrianglePreset) => {
        setAnchor({ p: preset.p, q: preset.q });
        setPreservePresetDisplay(true);
        setFormInputs({ p: String(preset.p), q: String(preset.q), r: String(preset.r) });
    }, []);

    const clearAnchor = useCallback(() => {
        setAnchor(null);
    }, []);

    const setSnapEnabled = useCallback((enabled: boolean) => {
        setSnapEnabledState(enabled);
    }, []);

    const applyDirectTriple = useCallback((triple: TriangleTriple) => {
        setAnchor(null);
        setPreservePresetDisplay(false);
        setFormInputs((prev) => {
            const next: FormInputs = {
                p: String(triple.p),
                q: String(triple.q),
                r: String(triple.r),
            };
            if (prev.p === next.p && prev.q === next.q && prev.r === next.r) {
                return prev;
            }
            return next;
        });
    }, []);

    const setRFromSlider = useCallback((value: number) => {
        setFormInputs((prev) => {
            const stringValue = String(value);
            if (prev.r === stringValue) {
                return prev;
            }
            return { ...prev, r: stringValue };
        });
    }, []);

    const updateDepth = useCallback((value: number) => {
        setParams((prev) => {
            const nextDepth = normalizeDepth(value);
            if (prev.depth === nextDepth) {
                return prev;
            }
            return { ...prev, depth: nextDepth };
        });
    }, []);

    useEffect(() => {
        if (!anchor) return;
        setFormInputs((prev) => {
            const next = {
                ...prev,
                p: String(anchor.p),
                q: String(anchor.q),
            };
            if (prev.p === next.p && prev.q === next.q) {
                return prev;
            }
            return next;
        });
    }, [anchor]);

    useEffect(() => {
        const parsed: TriangleTriple = {
            p: Number(formInputs.p),
            q: Number(formInputs.q),
            r: Number(formInputs.r),
        };

        const shouldSnap = geometryMode === GEOMETRY_KIND.hyperbolic && snapEnabled;
        const snapped = shouldSnap
            ? snapTriangleParams(parsed, {
                  nMax: triangleNMax,
                  locked: anchor ? { p: true, q: true } : undefined,
              })
            : parsed;

        if (shouldSnap && !preservePresetDisplay) {
            const nextInputs: FormInputs = {
                p: String(snapped.p),
                q: String(snapped.q),
                r: String(snapped.r),
            };
            const changed = (["p", "q", "r"] as const).some(
                (key) => nextInputs[key] !== formInputs[key],
            );
            if (changed) {
                setFormInputs(nextInputs);
                return;
            }
        }

        if (geometryMode === GEOMETRY_KIND.hyperbolic) {
            const validation = validateTriangleParams(snapped, {
                requireIntegers: snapEnabled,
            });
            if (validation.ok) {
                setParams((prev) => {
                    if (prev.p === snapped.p && prev.q === snapped.q && prev.r === snapped.r) {
                        return prev;
                    }
                    return { ...prev, ...snapped };
                });
                setParamError(null);
                setParamWarning(null);
                if (preservePresetDisplay) {
                    setPreservePresetDisplay(false);
                }
            } else {
                setParamError(validation.errors[0] ?? "Invalid parameters");
                setParamWarning(null);
            }
            return;
        }

        const euclid = validateEuclideanParams(snapped);
        if (euclid.ok) {
            setParams((prev) => {
                if (prev.p === snapped.p && prev.q === snapped.q && prev.r === snapped.r) {
                    return prev;
                }
                return { ...prev, ...snapped };
            });
            setParamError(null);
            setParamWarning(euclid.warning ?? null);
            if (preservePresetDisplay) {
                setPreservePresetDisplay(false);
            }
        } else {
            setParamError(euclid.errors[0] ?? "Invalid parameters");
            setParamWarning(null);
        }
    }, [formInputs, snapEnabled, anchor, triangleNMax, preservePresetDisplay, geometryMode]);

    useEffect(() => {
        if (geometryMode === GEOMETRY_KIND.euclidean) {
            const sum =
                1 / Number(formInputs.p || "1") +
                1 / Number(formInputs.q || "1") +
                1 / Number(formInputs.r || "1");
            if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-3) {
                setFromPreset(DEFAULT_EUCLIDEAN_PRESET);
            }
            return;
        }

        const validation = validateTriangleParams(
            {
                p: Number(formInputs.p),
                q: Number(formInputs.q),
                r: Number(formInputs.r),
            },
            { requireIntegers: snapEnabled },
        );
        if (!validation.ok && anchor) {
            setFromPreset(DEFAULT_HYPERBOLIC_PRESET);
        }
        setParamWarning(null);
    }, [geometryMode, formInputs, anchor, setFromPreset, snapEnabled]);

    const parsedR = Number(formInputs.r);
    const rSliderValue = Number.isFinite(parsedR) ? parsedR : params.r;

    return {
        params,
        formInputs,
        anchor,
        snapEnabled,
        paramError,
        paramWarning,
        rRange,
        rSliderValue,
        rStep: snapEnabled ? 1 : 0.1,
        depthRange,
        geometryMode,
        setParamInput,
        setFromPreset,
        clearAnchor,
        setSnapEnabled,
        setRFromSlider,
        updateDepth,
        setGeometryMode,
        applyDirectTriple,
    };
}
