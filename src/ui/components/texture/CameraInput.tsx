import { useMemo } from "react";
import { TEXTURE_SLOTS, type TextureSlot } from "@/render/webgl/textures";
import type { TextureSlotState } from "@/ui/hooks/useTextureSource";

const SLOT_LABELS: Record<TextureSlot, string> = {
    [TEXTURE_SLOTS.base]: "ベーステクスチャ",
    [TEXTURE_SLOTS.camera]: "カメラテクスチャ",
};

export type CameraInputProps = {
    slot?: TextureSlot;
    state: TextureSlotState;
    onEnable: () => void | Promise<void>;
    onDisable: () => void;
};

/**
 * CameraInput toggles MediaStream-backed textures for the specified texture slot.
 */
export function CameraInput({
    slot = TEXTURE_SLOTS.camera,
    state,
    onEnable,
    onDisable,
}: CameraInputProps): JSX.Element {
    const statusLabel = useMemo(() => {
        switch (state.status) {
            case "loading":
                return "カメラ初期化中";
            case "ready":
                return "カメラ入力を使用中";
            case "error":
                return state.error ?? "カメラ利用エラー";
            default:
                return "未接続";
        }
    }, [state]);

    const isActive = state.status === "ready";

    return (
        <fieldset
            style={{
                border: "1px solid #d0d7de",
                borderRadius: "8px",
                padding: "12px",
                display: "grid",
                gap: "8px",
            }}
        >
            <legend style={{ fontWeight: 600 }}>{SLOT_LABELS[slot]}（カメラ）</legend>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563" }}>
                カメラ入力を許可するとフレーム毎にテクスチャを更新します。HTTPS環境が必要です。
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
                <button
                    type="button"
                    onClick={() => {
                        if (!isActive) {
                            void onEnable();
                        } else {
                            onDisable();
                        }
                    }}
                    style={{
                        padding: "6px 12px",
                        borderRadius: "4px",
                        border: "1px solid #d0d7de",
                        background: isActive ? "#1d4ed8" : "#2563eb",
                        color: "#fff",
                        cursor: "pointer",
                    }}
                >
                    {isActive ? "カメラ停止" : "カメラを有効化"}
                </button>
            </div>
            <div
                style={{
                    fontSize: "0.8125rem",
                    color: state.status === "error" ? "#d32f2f" : "#4b5563",
                }}
            >
                ステータス: {statusLabel}
            </div>
        </fieldset>
    );
}
