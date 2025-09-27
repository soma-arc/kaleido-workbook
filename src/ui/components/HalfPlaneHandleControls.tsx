import type { ChangeEvent } from "react";

export type HalfPlaneHandleControlsProps = {
    showHandles: boolean;
    onToggle: (value: boolean) => void;
    spacing: number;
    onSpacingChange: (value: number) => void;
    disabled?: boolean;
};

function clampSpacing(value: number): number {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0.1;
    return Math.max(0.05, Math.min(value, 5));
}

export function HalfPlaneHandleControls({
    showHandles,
    onToggle,
    spacing,
    onSpacingChange,
    disabled = false,
}: HalfPlaneHandleControlsProps): JSX.Element {
    const handleToggle = (event: ChangeEvent<HTMLInputElement>) => {
        onToggle(event.target.checked);
    };

    const handleSpacingChange = (event: ChangeEvent<HTMLInputElement>) => {
        const next = clampSpacing(Number.parseFloat(event.target.value));
        onSpacingChange(next);
    };

    return (
        <fieldset style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "8px 12px" }}>
            <legend style={{ padding: "0 4px", fontSize: "0.9rem" }}>Half-plane Handles</legend>
            <label
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}
            >
                <input
                    type="checkbox"
                    checked={showHandles}
                    onChange={handleToggle}
                    disabled={disabled}
                />
                <span>Show control handles</span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span>Initial spacing</span>
                <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="5"
                    value={spacing}
                    onChange={handleSpacingChange}
                    disabled={disabled || !showHandles}
                />
            </label>
        </fieldset>
    );
}
