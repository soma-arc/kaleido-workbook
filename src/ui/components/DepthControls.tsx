export type DepthControlsProps = {
    depth: number;
    depthRange: { min: number; max: number };
    onDepthChange: (value: number) => void;
};

export function DepthControls({
    depth,
    depthRange,
    onDepthChange,
}: DepthControlsProps): JSX.Element {
    const handleChange = (value: string) => {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            onDepthChange(numeric);
        }
    };

    return (
        <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontWeight: 600 }}>Depth (slider)</span>
                <input
                    type="range"
                    min={depthRange.min}
                    max={depthRange.max}
                    step={1}
                    value={depth}
                    onInput={(event) => handleChange(event.currentTarget.value)}
                    onChange={(event) => handleChange(event.currentTarget.value)}
                />
            </label>
            <label style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontWeight: 600 }}>Depth (exact)</span>
                <input
                    type="number"
                    min={depthRange.min}
                    max={depthRange.max}
                    step={1}
                    value={depth}
                    onInput={(event) => handleChange(event.currentTarget.value)}
                    onChange={(event) => handleChange(event.currentTarget.value)}
                />
            </label>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#555" }}>
                Depth range: {depthRange.min} – {depthRange.max}
            </p>
        </div>
    );
}
