import type { TrianglePreset, TrianglePresetGroup } from "@/ui/trianglePresets";
import { EmbedOverlayPanel } from "./EmbedOverlayPanel";
import { SnapControls } from "./SnapControls";

export type HalfPlaneOverlayControlsProps = {
    title: string;
    presetGroups: readonly TrianglePresetGroup[];
    activePresetId?: string;
    onSelectPreset: (preset: TrianglePreset) => void;
    onClearPreset?: () => void;
    snapEnabled: boolean;
    onSnapToggle: (enabled: boolean) => void;
    showHandles: boolean;
    onToggleHandles: () => void;
};

export function HalfPlaneOverlayControls({
    title,
    presetGroups,
    activePresetId,
    onSelectPreset,
    onClearPreset,
    snapEnabled,
    onSnapToggle,
    showHandles,
    onToggleHandles,
}: HalfPlaneOverlayControlsProps): JSX.Element {
    return (
        <EmbedOverlayPanel title={title} subtitle="Overlay Controls">
            <div
                style={{
                    display: "grid",
                    gap: "12px",
                    alignItems: "start",
                    width: "100%",
                }}
            >
                <section style={{ display: "grid", gap: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>角度プリセット</span>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
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
                                            padding: "6px 10px",
                                            borderRadius: 8,
                                            border: active
                                                ? "1px solid rgba(59,130,246,0.75)"
                                                : "1px solid rgba(148,163,184,0.6)",
                                            background: active
                                                ? "rgba(59,130,246,0.2)"
                                                : "rgba(15,23,42,0.35)",
                                            color: "#e2e8f0",
                                            minWidth: "min(140px, 40vw)",
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            }),
                        )}
                    </div>
                    {onClearPreset ? (
                        <button
                            type="button"
                            onClick={onClearPreset}
                            style={{
                                justifySelf: "start",
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px dashed rgba(148,163,184,0.6)",
                                color: "#e2e8f0",
                                background: "rgba(15,23,42,0.25)",
                            }}
                        >
                            カスタム
                        </button>
                    ) : null}
                </section>
                <SnapControls snapEnabled={snapEnabled} onToggle={onSnapToggle} />
                <button
                    type="button"
                    data-testid="embed-overlay-euclidean-toggle"
                    onClick={onToggleHandles}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: showHandles ? "rgba(59,130,246,0.25)" : "rgba(15,23,42,0.55)",
                        color: "#e2e8f0",
                    }}
                >
                    {showHandles ? "ハンドルを隠す" : "ハンドルを表示"}
                </button>
            </div>
        </EmbedOverlayPanel>
    );
}
