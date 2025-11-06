import { useCallback, useEffect, useMemo, useState } from "react";
import type { HyperbolicSceneBindingFactory } from "@/ui/scenes/types";
import {
    HYPERBOLIC_TILING_TRIPLE_FAMILY_MAX_R,
    HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R,
    HYPERBOLIC_TILING_TRIPLE_FAMILY_REFLECTIONS,
    HYPERBOLIC_TILING_TRIPLE_FAMILY_STEP,
} from "./constants";
import type { HyperbolicTripleFamilyOverlayProps } from "./ui/Overlay";

const clampFamilyR = (value: number): number => {
    const clamped = Math.min(
        HYPERBOLIC_TILING_TRIPLE_FAMILY_MAX_R,
        Math.max(HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R, value),
    );
    return (
        Math.round(clamped / HYPERBOLIC_TILING_TRIPLE_FAMILY_STEP) *
        HYPERBOLIC_TILING_TRIPLE_FAMILY_STEP
    );
};

export const createHyperbolicTripleFamilyBinding: HyperbolicSceneBindingFactory = (context) => {
    const { createId, triangle, scene } = context;
    const [family, setFamily] = useState<{ p: number; q: number }>({ p: 3, q: 3 });
    const [rValue, setRValue] = useState<number>(HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R);
    const sliderId = useMemo(() => createId("family-reflections"), [createId]);

    useEffect(() => {
        if (!scene) return;
        setFamily({ p: 3, q: 3 });
        setRValue(HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R);
    }, [scene]);

    useEffect(() => {
        triangle.applyDirectTriple({ p: family.p, q: family.q, r: rValue });
    }, [family, rValue, triangle]);

    const handleFamilyChange = useCallback((next: { p: number; q: number }) => {
        setFamily(next);
        setRValue(HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R);
    }, []);

    const handleSliderChange = useCallback((next: number) => {
        setRValue((prev) => {
            const snapped = clampFamilyR(next);
            return prev === snapped ? prev : snapped;
        });
    }, []);

    const overlayControls: HyperbolicTripleFamilyOverlayProps = useMemo(
        () => ({
            activeFamily: family,
            onSelectFamily: handleFamilyChange,
            rSlider: {
                sliderId,
                min: HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R,
                max: HYPERBOLIC_TILING_TRIPLE_FAMILY_MAX_R,
                step: HYPERBOLIC_TILING_TRIPLE_FAMILY_STEP,
                value: clampFamilyR(rValue),
                onChange: handleSliderChange,
            },
        }),
        [family, handleFamilyChange, handleSliderChange, rValue, sliderId],
    );

    const uniforms = useMemo(
        () => ({ uMaxReflections: HYPERBOLIC_TILING_TRIPLE_FAMILY_REFLECTIONS }),
        [],
    );

    const paramsOverride = useMemo(
        () => ({
            p: family.p,
            q: family.q,
            r: clampFamilyR(rValue),
            depth: triangle.params.depth,
        }),
        [family, rValue, triangle.params.depth],
    );

    return {
        uniforms,
        paramsOverride,
        controlsExtras: { tripleFamilyControls: overlayControls },
        overlayExtras: { tripleFamilyControls: overlayControls },
    };
};
