import type { TrianglePreset, TrianglePresetGroup } from "../trianglePresets";

export type PresetSelectorProps = {
    groups: readonly TrianglePresetGroup[];
    activePresetId?: string;
    onSelect: (preset: TrianglePreset) => void;
    onClear?: () => void;
    summary?: string;
};

export function PresetSelector({
    groups,
    activePresetId,
    onSelect,
    onClear,
    summary,
}: PresetSelectorProps): JSX.Element {
    return (
        <div style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontWeight: 600 }}>Presets</span>
            <div style={{ display: "grid", gap: "12px" }}>
                {groups.map((group) => (
                    <section key={group.label} style={{ display: "grid", gap: "6px" }}>
                        <strong style={{ fontSize: "0.9rem" }}>{group.label}</strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {group.presets.map((preset) => {
                                const active = preset.id === activePresetId;
                                return (
                                    <button
                                        key={preset.id}
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
                        </div>
                    </section>
                ))}
            </div>
            {onClear ? (
                <button
                    type="button"
                    onClick={onClear}
                    style={{
                        padding: "4px 8px",
                        border: "1px solid #bbb",
                        cursor: "pointer",
                        justifySelf: "start",
                    }}
                >
                    Custom
                </button>
            ) : null}
            {summary ? <span style={{ fontSize: "0.8rem", color: "#555" }}>{summary}</span> : null}
        </div>
    );
}
