import { useCallback, useEffect, useMemo, useState } from "react";
import type { HyperbolicSceneBindingFactory } from "@/ui/scenes/types";
import {
    HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS,
    HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
    HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
} from "./constants";
import type { HyperbolicTiling333ControlsProps } from "./ui/Controls";

const clampReflections = (value: number): number =>
    Math.min(
        HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
        Math.max(HYPERBOLIC_TILING_333_MIN_REFLECTIONS, Math.round(value)),
    );

export const createHyperbolicTripleReflectionBinding: HyperbolicSceneBindingFactory = (context) => {
    const { createId, scene } = context;
    const [maxReflections, setMaxReflections] = useState(HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS);
    const sliderId = useMemo(() => createId("reflections"), [createId]);

    useEffect(() => {
        if (!scene) return;
        setMaxReflections(HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS);
    }, [scene]);

    const handleChange = useCallback((next: number) => {
        setMaxReflections((prev) => {
            const clamped = clampReflections(next);
            return prev === clamped ? prev : clamped;
        });
    }, []);

    const reflectionControls: HyperbolicTiling333ControlsProps = useMemo(
        () => ({
            sliderId,
            min: HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
            max: HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
            step: 1,
            value: maxReflections,
            onChange: handleChange,
        }),
        [sliderId, maxReflections, handleChange],
    );

    const uniforms = useMemo(() => ({ uMaxReflections: maxReflections }), [maxReflections]);

    return {
        uniforms,
        controlsExtras: { reflectionControls },
        overlayExtras: { reflectionControls },
    };
};
