import { useCallback, useEffect, useMemo, useState } from "react";
import type { TilingParams } from "../../geom/tiling";
import {
    normalizeDepth,
    validateEuclideanParams,
    validateTriangleParams,
} from "../../geom/triangleParams";
import { type PqrKey, snapTriangleParams, type TriangleTriple } from "../../geom/triangleSnap";

export type TrianglePreset = { label: string; p: number; q: number; r: number };

export type GeometryMode = "hyperbolic" | "euclidean";

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
        options.initialGeometryMode ?? "hyperbolic",
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

        const snapped = snapEnabled
            ? snapTriangleParams(parsed, {
                  nMax: triangleNMax,
                  locked: anchor ? { p: true, q: true } : undefined,
              })
            : parsed;

        if (snapEnabled && !preservePresetDisplay) {
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

        if (geometryMode === "hyperbolic") {
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
        if (geometryMode !== "euclidean") {
            setParamWarning(null);
            return;
        }
        const sum =
            1 / Number(formInputs.p || "1") +
            1 / Number(formInputs.q || "1") +
            1 / Number(formInputs.r || "1");
        if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-3) {
            setFromPreset({ label: "(3,3,3)", p: 3, q: 3, r: 3 });
        }
    }, [geometryMode, formInputs, setFromPreset]);

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
    };
}
