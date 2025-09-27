import type { SceneDefinition, SceneId } from "@/ui/scenes";

export type ModeControlsProps = {
    scenes: SceneDefinition[];
    activeSceneId: SceneId;
    onSceneChange: (sceneId: SceneId) => void;
    renderBackend: string;
};

export function ModeControls({
    scenes,
    activeSceneId,
    onSceneChange,
    renderBackend,
}: ModeControlsProps) {
    return (
        <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontWeight: 600 }}>Scene</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {scenes.map((scene) => {
                        const active = scene.id === activeSceneId;
                        return (
                            <button
                                key={scene.id}
                                type="button"
                                onClick={() => onSceneChange(scene.id)}
                                style={{
                                    padding: "4px 8px",
                                    border: active ? "1px solid #4a90e2" : "1px solid #bbb",
                                    backgroundColor: active ? "#e6f1fc" : "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                {scene.label}
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
