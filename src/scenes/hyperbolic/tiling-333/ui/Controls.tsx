import type { ChangeEvent } from "react";
import { EmbedOverlayPanel } from "@/ui/components/EmbedOverlayPanel";
import {
    HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS,
    HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
    HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
} from "../constants";

export type HyperbolicTiling333ControlsProps = {
    sliderId: string;
    min?: number;
    max?: number;
    step?: number;
    value: number;
    onChange: (next: number) => void;
    variant?: "panel" | "overlay";
};

export type HyperbolicTiling333TriangleSliderProps = {
    sliderId: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (next: number) => void;
};

export type HyperbolicTiling333OverlayControlsProps = {
    reflectionControls?: HyperbolicTiling333ControlsProps;
    triangleSlider?: HyperbolicTiling333TriangleSliderProps;
};

const PANEL_CONTAINER_STYLE = { display: "grid", gap: "4px" } as const;
const OVERLAY_CONTAINER_STYLE = { display: "grid", gap: "6px", minWidth: 200 } as const;
const PANEL_LABEL_STYLE = { fontWeight: 600 } as const;
const OVERLAY_LABEL_STYLE = { fontWeight: 600, fontSize: "0.9rem" } as const;
const HELPER_STYLE = { fontSize: "0.75rem", opacity: 0.75 } as const;
const OVERLAY_SECTION_STYLE = { display: "grid", gap: "8px" } as const;

function formatRValue(value: number): string {
    if (!Number.isFinite(value)) {
        return "-";
    }
    if (Math.abs(value - Math.round(value)) < 1e-6) {
        return `${Math.round(value)}`;
    }
    return value.toFixed(2);
}

export function HyperbolicTiling333Controls({
    sliderId,
    min = HYPERBOLIC_TILING_333_MIN_REFLECTIONS,
    max = HYPERBOLIC_TILING_333_MAX_REFLECTIONS,
    step = 1,
    value,
    onChange,
    variant = "panel",
}: HyperbolicTiling333ControlsProps): JSX.Element {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.target.value);
        if (Number.isFinite(nextValue)) {
            onChange(nextValue);
        }
    };

    const containerStyle = variant === "overlay" ? OVERLAY_CONTAINER_STYLE : PANEL_CONTAINER_STYLE;
    const labelStyle = variant === "overlay" ? OVERLAY_LABEL_STYLE : PANEL_LABEL_STYLE;
    const helperText = `反射回数: ${value}`;
    const rangeHint = `${min}〜${max}`;

    return (
        <div style={containerStyle}>
            <label htmlFor={sliderId} style={labelStyle}>
                {helperText}
            </label>
            <input
                id={sliderId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
            />
            {variant === "overlay" ? (
                <span style={HELPER_STYLE}>
                    {`0 〜 ${max} の範囲で回数を制御します。デフォルト: ${HYPERBOLIC_TILING_333_DEFAULT_REFLECTIONS}`}
                </span>
            ) : (
                <span style={HELPER_STYLE}>{`許容範囲: ${rangeHint}`}</span>
            )}
        </div>
    );
}

export function HyperbolicTiling333OverlayControls(
    props: HyperbolicTiling333OverlayControlsProps,
): JSX.Element {
    const { reflectionControls, triangleSlider } = props;
    if (!reflectionControls && !triangleSlider) {
        return <EmbedOverlayPanel title="Hyperbolic Triple Reflection" subtitle="Scene" />;
    }
    return (
        <EmbedOverlayPanel title="Hyperbolic Triple Reflection" subtitle="Scene">
            <div style={OVERLAY_SECTION_STYLE}>
                {triangleSlider ? <HyperbolicTiling333TriangleSlider {...triangleSlider} /> : null}
                {reflectionControls ? (
                    <HyperbolicTiling333Controls {...reflectionControls} variant="overlay" />
                ) : null}
            </div>
        </EmbedOverlayPanel>
    );
}

export function HyperbolicTiling333TriangleSlider({
    sliderId,
    min,
    max,
    step,
    value,
    onChange,
}: HyperbolicTiling333TriangleSliderProps): JSX.Element {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.target.value);
        if (Number.isFinite(nextValue)) {
            onChange(nextValue);
        }
    };

    return (
        <div style={OVERLAY_CONTAINER_STYLE}>
            <label htmlFor={sliderId} style={OVERLAY_LABEL_STYLE}>
                {`Triangle r: ${formatRValue(value)}`}
            </label>
            <input
                id={sliderId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
            />
            <span style={HELPER_STYLE}>{`${min}〜${max} の範囲で連続的に調整できます`}</span>
        </div>
    );
}
