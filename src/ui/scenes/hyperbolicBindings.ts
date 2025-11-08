import { useCallback, useEffect, useMemo, useState } from "react";
import {
    HYPERBOLIC_REGULAR_NGON_DEFAULT_N,
    HYPERBOLIC_REGULAR_NGON_DEFAULT_Q,
    HYPERBOLIC_REGULAR_NGON_N_MAX,
    HYPERBOLIC_REGULAR_NGON_N_MIN,
    HYPERBOLIC_REGULAR_NGON_Q_MAX,
    HYPERBOLIC_REGULAR_NGON_Q_MIN,
    HYPERBOLIC_REGULAR_NGON_SCENE_ID,
} from "@/scenes/hyperbolic/regular-ngon";
import type { HyperbolicRegularNgonOverlayExtras } from "@/scenes/hyperbolic/regular-ngon/ui/Overlay";
import { HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID } from "@/scenes/hyperbolic/tiling-333";
import {
    HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS,
    HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
    HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
} from "@/scenes/hyperbolic/tiling-333/constants";
import type { HyperbolicTiling333ControlsProps } from "@/scenes/hyperbolic/tiling-333/ui/Controls";
import { HYPERBOLIC_TRIPLE_FAMILY_SCENE_ID } from "@/scenes/hyperbolic/tiling-triple-family";
import {
    HYPERBOLIC_TILING_TRIPLE_FAMILY_MAX_R,
    HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R,
    HYPERBOLIC_TILING_TRIPLE_FAMILY_REFLECTIONS,
    HYPERBOLIC_TILING_TRIPLE_FAMILY_STEP,
} from "@/scenes/hyperbolic/tiling-triple-family/constants";
import type { HyperbolicTripleFamilyOverlayProps } from "@/scenes/hyperbolic/tiling-triple-family/ui/Overlay";
import type { HyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import type {
    HyperbolicParamsOverride,
    SceneContextExtras,
    SceneDefinition,
} from "@/ui/scenes/types";
import type { HyperbolicTripleReflectionUniforms } from "./types";

export type HyperbolicBindingResult = {
    uniforms?: HyperbolicTripleReflectionUniforms;
    controlsExtras?: SceneContextExtras;
    overlayExtras?: SceneContextExtras;
    paramsOverride?: HyperbolicParamsOverride;
    suspendRender?: boolean;
};

const EMPTY_BINDING: HyperbolicBindingResult = Object.freeze({});

type BindingContext = {
    scene: SceneDefinition;
    triangle: HyperbolicTriangleState;
    sliderId: string;
    triangleSliderId: string;
    createId: (suffix: string) => string;
};

const clampReflections = (value: number): number =>
    Math.min(
        HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
        Math.max(HYPERBOLIC_TILING_333_MIN_REFLECTIONS, Math.round(value)),
    );

export function useHyperbolicTripleReflectionBinding(
    context: BindingContext,
    active: boolean,
): HyperbolicBindingResult {
    const { createId } = context;
    const [maxReflections, setMaxReflections] = useState(HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS);

    useEffect(() => {
        if (!active) {
            return;
        }
        setMaxReflections(HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS);
    }, [active]);

    const handleChange = useCallback((next: number) => {
        setMaxReflections((prev) => {
            const clamped = clampReflections(next);
            return prev === clamped ? prev : clamped;
        });
    }, []);

    const sliderId = useMemo(() => createId("reflections"), [createId]);

    const controls: HyperbolicTiling333ControlsProps | undefined = useMemo(() => {
        if (!active) {
            return undefined;
        }
        return {
            sliderId,
            min: HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
            max: HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
            step: 1,
            value: maxReflections,
            onChange: handleChange,
        };
    }, [active, sliderId, maxReflections, handleChange]);

    const uniforms = useMemo<HyperbolicTripleReflectionUniforms>(() => {
        return { uMaxReflections: maxReflections };
    }, [maxReflections]);

    if (!active) {
        return EMPTY_BINDING;
    }

    return {
        uniforms,
        controlsExtras: controls ? { reflectionControls: controls } : undefined,
        overlayExtras: controls ? { reflectionControls: controls } : undefined,
    };
}

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

const clampRegularNgonN = (value: number): number => {
    const rounded = Math.round(value);
    return Math.min(
        HYPERBOLIC_REGULAR_NGON_N_MAX,
        Math.max(HYPERBOLIC_REGULAR_NGON_N_MIN, rounded),
    );
};

const clampRegularNgonQ = (value: number): number => {
    const rounded = Math.round(value);
    return Math.min(
        HYPERBOLIC_REGULAR_NGON_Q_MAX,
        Math.max(HYPERBOLIC_REGULAR_NGON_Q_MIN, rounded),
    );
};

const isHyperbolicNgonValid = (n: number, q: number): boolean => (n - 2) * (q - 2) > 4;

export function useHyperbolicTripleFamilyBinding(
    context: BindingContext,
    active: boolean,
): HyperbolicBindingResult {
    const { createId, triangle } = context;
    const [family, setFamily] = useState<{ p: number; q: number }>({ p: 3, q: 3 });
    const [rValue, setRValue] = useState<number>(HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R);
    const sliderId = useMemo(() => createId("family-reflections"), [createId]);

    useEffect(() => {
        if (!active) {
            return;
        }
        setFamily({ p: 3, q: 3 });
        setRValue(HYPERBOLIC_TILING_TRIPLE_FAMILY_MIN_R);
    }, [active]);

    useEffect(() => {
        if (!active) {
            return;
        }
        triangle.applyDirectTriple({
            p: family.p,
            q: family.q,
            r: clampFamilyR(rValue),
        });
    }, [active, family, rValue, triangle]);

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

    const overlayControls: HyperbolicTripleFamilyOverlayProps | undefined = useMemo(() => {
        if (!active) {
            return undefined;
        }
        return {
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
        };
    }, [active, family, handleFamilyChange, handleSliderChange, rValue, sliderId]);

    const uniforms: HyperbolicTripleReflectionUniforms = useMemo(
        () => ({ uMaxReflections: HYPERBOLIC_TILING_TRIPLE_FAMILY_REFLECTIONS }),
        [],
    );

    const paramsOverride = useMemo<HyperbolicParamsOverride>(
        () => ({
            kind: "triangle",
            params: {
                p: family.p,
                q: family.q,
                r: clampFamilyR(rValue),
                depth: triangle.params.depth,
            },
        }),
        [family, rValue, triangle.params.depth],
    );

    if (!active) {
        return EMPTY_BINDING;
    }

    return {
        uniforms,
        paramsOverride,
        controlsExtras: overlayControls ? { tripleFamilyControls: overlayControls } : undefined,
        overlayExtras: overlayControls ? { tripleFamilyControls: overlayControls } : undefined,
    };
}

export function useHyperbolicBindingForScene(
    scene: SceneDefinition,
    context: BindingContext,
): HyperbolicBindingResult {
    const reflectionBinding = useHyperbolicTripleReflectionBinding(
        context,
        scene.id === HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID,
    );
    const tripleFamilyBinding = useHyperbolicTripleFamilyBinding(
        context,
        scene.id === HYPERBOLIC_TRIPLE_FAMILY_SCENE_ID,
    );
    const regularNgonBinding = useHyperbolicRegularNgonBinding(
        context,
        scene.id === HYPERBOLIC_REGULAR_NGON_SCENE_ID,
    );

    if (scene.id === HYPERBOLIC_TRIPLE_REFLECTION_SCENE_ID) {
        return reflectionBinding;
    }
    if (scene.id === HYPERBOLIC_TRIPLE_FAMILY_SCENE_ID) {
        return tripleFamilyBinding;
    }
    if (scene.id === HYPERBOLIC_REGULAR_NGON_SCENE_ID) {
        return regularNgonBinding;
    }
    return EMPTY_BINDING;
}

function useHyperbolicRegularNgonBinding(
    context: BindingContext,
    active: boolean,
): HyperbolicBindingResult {
    const { createId } = context;
    const [nValue, setNValue] = useState(HYPERBOLIC_REGULAR_NGON_DEFAULT_N);
    const [qValue, setQValue] = useState(HYPERBOLIC_REGULAR_NGON_DEFAULT_Q);

    useEffect(() => {
        if (!active) {
            return;
        }
        setNValue(HYPERBOLIC_REGULAR_NGON_DEFAULT_N);
        setQValue(HYPERBOLIC_REGULAR_NGON_DEFAULT_Q);
    }, [active]);

    const handleNChange = useCallback((next: number) => {
        setNValue((prev) => {
            const clamped = clampRegularNgonN(next);
            return prev === clamped ? prev : clamped;
        });
    }, []);

    const handleQChange = useCallback((next: number) => {
        setQValue((prev) => {
            const clamped = clampRegularNgonQ(next);
            return prev === clamped ? prev : clamped;
        });
    }, []);

    const nSliderId = useMemo(() => createId("regular-ngon-n"), [createId]);
    const qSliderId = useMemo(() => createId("regular-ngon-q"), [createId]);
    const isValid = isHyperbolicNgonValid(nValue, qValue);

    const paramsOverride = useMemo<HyperbolicParamsOverride | undefined>(() => {
        if (!active || !isValid) {
            return undefined;
        }
        return {
            kind: "regularNgon",
            n: nValue,
            q: qValue,
        };
    }, [active, isValid, nValue, qValue]);

    const overlayExtras = useMemo<SceneContextExtras | undefined>(() => {
        if (!active) {
            return undefined;
        }
        const overlay: HyperbolicRegularNgonOverlayExtras = {
            regularNgonOverlay: {
                nSlider: {
                    sliderId: nSliderId,
                    label: "n",
                    min: HYPERBOLIC_REGULAR_NGON_N_MIN,
                    max: HYPERBOLIC_REGULAR_NGON_N_MAX,
                    value: nValue,
                    onChange: handleNChange,
                },
                qSlider: {
                    sliderId: qSliderId,
                    label: "q",
                    min: HYPERBOLIC_REGULAR_NGON_Q_MIN,
                    max: HYPERBOLIC_REGULAR_NGON_Q_MAX,
                    value: qValue,
                    onChange: handleQChange,
                },
                warning: isValid ? undefined : "(n-2)(q-2) > 4 を満たすよう調整してください",
            },
        };
        return overlay;
    }, [active, handleNChange, handleQChange, isValid, nSliderId, qSliderId, nValue, qValue]);

    if (!active) {
        return EMPTY_BINDING;
    }

    return {
        paramsOverride,
        overlayExtras,
        suspendRender: !isValid,
    };
}
