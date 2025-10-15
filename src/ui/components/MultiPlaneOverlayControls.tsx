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
                gap: "8px",
                alignItems: "start",
                width: "fit-content",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label htmlFor={sliderId} style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    Mirror count
                </label>
                <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{value}</span>
            </div>
            <input
                id={sliderId}
                type="range"
                min={minSides}
                max={maxSides}
                step={1}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                aria-label="Number of mirrors"
                style={{ width: "min(280px, 40vw)" }}
            />
        </div>
    );
}
