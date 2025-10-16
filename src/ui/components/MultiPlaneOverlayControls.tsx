import { useId } from "react";

export type MultiPlaneOverlayControlsProps = {
    minSides: number;
    maxSides: number;
    value: number;
    onChange: (next: number) => void;
};

export function MultiPlaneOverlayControls({
    minSides,
    maxSides,
    value,
    onChange,
}: MultiPlaneOverlayControlsProps): JSX.Element {
    const sliderId = useId();
    return (
        <div
            style={{
                display: "grid",
                gap: "6px",
                alignItems: "start",
                width: "fit-content",
            }}
        >
            <label htmlFor={sliderId} style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Mirror count: {value}
            </label>
            <input
                id={sliderId}
                type="range"
                min={minSides}
                max={maxSides}
                step={1}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                aria-label="Number of mirrors"
                style={{ width: "min(240px, 35vw)" }}
            />
        </div>
    );
}
