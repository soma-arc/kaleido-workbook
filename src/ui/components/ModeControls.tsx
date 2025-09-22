import type { GeometryMode } from "../hooks/useTriangleParams";

export type ModeControlsProps = {
    geometryMode: GeometryMode;
    onGeometryChange: (mode: GeometryMode) => void;
    renderBackend: string;
};

const MODES: GeometryMode[] = ["hyperbolic", "euclidean"];

const LABELS: Record<GeometryMode, string> = {
    hyperbolic: "Hyperbolic",
    euclidean: "Euclidean",
};

export function ModeControls({ geometryMode, onGeometryChange, renderBackend }: ModeControlsProps) {
    return (
        <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontWeight: 600 }}>Geometry Mode</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {MODES.map((mode) => {
                        const active = mode === geometryMode;
                        return (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onGeometryChange(mode)}
                                style={{
                                    padding: "4px 8px",
                                    border: active ? "1px solid #4a90e2" : "1px solid #bbb",
                                    backgroundColor: active ? "#e6f1fc" : "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                {LABELS[mode]}
                            </button>
                        );
                    })}
                </div>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#555" }}>
                Render backend: {renderBackend}
            </span>
        </div>
    );
}
