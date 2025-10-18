import type { TrianglePreset, TrianglePresetGroup } from "@/ui/trianglePresets";
import { SnapControls } from "./SnapControls";

export type HalfPlaneOverlayControlsProps = {
    presetGroups: readonly TrianglePresetGroup[];
    activePresetId?: string;
    onSelectPreset: (preset: TrianglePreset) => void;
    snapEnabled: boolean;
    onSnapToggle: (enabled: boolean) => void;
    showHandles: boolean;
    onToggleHandles: () => void;
};

export function HalfPlaneOverlayControls({
    presetGroups,
    activePresetId,
    onSelectPreset,
    snapEnabled,
    onSnapToggle,
    showHandles,
    onToggleHandles,
}: HalfPlaneOverlayControlsProps): JSX.Element {
    return (
        <div
            style={{
                display: "grid",
                gap: "10px",
                alignItems: "start",
                width: "fit-content",
                maxWidth: "100%",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    justifyContent: "flex-start",
                }}
            >
                {presetGroups.flatMap((group) =>
                    group.presets.map((preset) => {
                        const active = preset.id === activePresetId;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                aria-label={`${preset.label} を適用`}
                                data-preset-id={preset.id}
                                onClick={() => onSelectPreset(preset)}
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    border: active
                                        ? "1px solid rgba(59,130,246,0.75)"
                                        : "1px solid rgba(148,163,184,0.6)",
                                    background: active
                                        ? "rgba(59,130,246,0.2)"
                                        : "rgba(15,23,42,0.35)",
                                    color: "#e2e8f0",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {preset.label}
                            </button>
                        );
                    }),
                )}
            </div>
            <div
                style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    flexWrap: "wrap",
                }}
            >
                <SnapControls snapEnabled={snapEnabled} onToggle={onSnapToggle} />
                <button
                    type="button"
                    data-testid="embed-overlay-euclidean-toggle"
                    onClick={onToggleHandles}
                    style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: showHandles ? "rgba(59,130,246,0.25)" : "rgba(15,23,42,0.55)",
                        color: "#e2e8f0",
                    }}
                >
                    {showHandles ? "ハンドルを隠す" : "ハンドルを表示"}
                </button>
            </div>
        </div>
    );
}
