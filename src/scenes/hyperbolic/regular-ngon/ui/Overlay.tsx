import type { ChangeEvent } from "react";
import { EmbedOverlayPanel } from "@/ui/components/EmbedOverlayPanel";

const SLIDER_CONTAINER_STYLE = {
    display: "grid",
    gap: "4px",
} as const;

const SLIDER_LABEL_STYLE = {
    fontWeight: 600,
    fontSize: "0.9rem",
} as const;

const WARNING_STYLE = {
    margin: 0,
    fontSize: "0.85rem",
    color: "#ffd166",
} as const;

export type RegularNgonSliderProps = {
    sliderId: string;
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (next: number) => void;
};

export type HyperbolicRegularNgonOverlayProps = {
    nSlider: RegularNgonSliderProps;
    qSlider: RegularNgonSliderProps;
    warning?: string;
};

type SliderInputProps = RegularNgonSliderProps & { step?: number };

function RegularNgonSlider({
    sliderId,
    label,
    min,
    max,
    value,
    onChange,
    step = 1,
}: SliderInputProps) {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.target.value);
        if (Number.isFinite(nextValue)) {
            onChange(nextValue);
        }
    };
    return (
        <div style={SLIDER_CONTAINER_STYLE}>
            <label htmlFor={sliderId} style={SLIDER_LABEL_STYLE}>
                {`${label}: ${Math.round(value)}`}
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
        </div>
    );
}

export function HyperbolicRegularNgonOverlay({
    nSlider,
    qSlider,
    warning,
}: HyperbolicRegularNgonOverlayProps): JSX.Element {
    return (
        <EmbedOverlayPanel
            title="Regular n-gon"
            subtitle="Unit disk / hyperbolic"
            footer={
                warning ? (
                    <p aria-live="polite" style={WARNING_STYLE}>
                        {warning}
                    </p>
                ) : undefined
            }
        >
            <RegularNgonSlider {...nSlider} />
            <RegularNgonSlider {...qSlider} />
        </EmbedOverlayPanel>
    );
}

export type HyperbolicRegularNgonOverlayExtras = {
    regularNgonOverlay?: HyperbolicRegularNgonOverlayProps;
};
