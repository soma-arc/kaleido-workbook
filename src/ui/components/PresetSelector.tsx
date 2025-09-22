import type { TrianglePreset } from "../hooks/useTriangleParams";

export type PresetSelectorProps = {
    presets: TrianglePreset[];
    anchor: { p: number; q: number } | null;
    onSelect: (preset: TrianglePreset) => void;
    onClear: () => void;
};

export function PresetSelector({
    presets,
    anchor,
    onSelect,
    onClear,
}: PresetSelectorProps): JSX.Element {
    return (
        <div style={{ display: "grid", gap: "4px" }}>
            <span style={{ fontWeight: 600 }}>Presets</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {presets.map((preset) => {
                    const active = !!anchor && anchor.p === preset.p && anchor.q === preset.q;
                    return (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => onSelect(preset)}
                            style={{
                                padding: "4px 8px",
                                border: active ? "1px solid #4a90e2" : "1px solid #bbb",
                                backgroundColor: active ? "#e6f1fc" : "#fff",
                                cursor: "pointer",
                            }}
                        >
                            {preset.label}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={onClear}
                    style={{
                        padding: "4px 8px",
                        border: "1px solid #bbb",
                        cursor: "pointer",
                    }}
                >
                    Custom
                </button>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#555" }}>
                Anchor: {anchor ? `p=${anchor.p}, q=${anchor.q}` : "none"}
            </span>
        </div>
    );
}
