import { useEffect } from "react";
import type { HyperbolicTriangleState } from "@/ui/hooks/useHyperbolicTriangleState";
import { ESCHER_PRESETS } from "../constants";

type EscherOverlayControlsProps = {
    triangle?: HyperbolicTriangleState;
    onClearDrawing?: () => void;
};

export function EscherOverlayControls({
    triangle,
    onClearDrawing,
}: EscherOverlayControlsProps): JSX.Element {
    const activePresetId = ESCHER_PRESETS.find((preset) => {
        if (!triangle) return false;
        return (
            triangle.params.p === preset.triple.p &&
            triangle.params.q === preset.triple.q &&
            triangle.params.r === preset.triple.r
        );
    })?.id;

    useEffect(() => {
        if (!triangle) return;
        if (!activePresetId) {
            triangle.applyDirectTriple(ESCHER_PRESETS[0].triple);
        }
    }, [triangle, activePresetId]);

    const handleSelect = (id: string) => {
        const preset = ESCHER_PRESETS.find((item) => item.id === id);
        if (!preset) {
            return;
        }
        triangle?.applyDirectTriple(preset.triple);
    };

    return (
        <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
                {ESCHER_PRESETS.map((preset) => {
                    const active = activePresetId === preset.id;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelect(preset.id)}
                            disabled={active}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: active ? "1px solid #0ea5e9" : "1px solid #cbd5f5",
                                background: active ? "#0ea5e91a" : "rgba(15,23,42,0.35)",
                                color: "#e2e8f0",
                                fontSize: "0.85rem",
                                cursor: active ? "default" : "pointer",
                                transition: "background 0.2s ease, border-color 0.2s ease",
                                opacity: active ? 1 : 0.85,
                            }}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                onClick={() => onClearDrawing?.()}
                style={{
                    justifySelf: "start",
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5f5",
                    background: "rgba(15,23,42,0.35)",
                    color: "#e2e8f0",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                }}
            >
                描画をクリア
            </button>
        </div>
    );
}
