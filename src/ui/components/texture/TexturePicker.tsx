import { type ChangeEvent, useId, useState } from "react";
import { TEXTURE_SLOTS, type TextureSlot } from "@/render/webgl/textures";
import type { TextureSlotState } from "@/ui/hooks/useTextureSource";
import type { TexturePreset } from "@/ui/texture/types";

const SLOT_LABELS: Record<TextureSlot, string> = {
    [TEXTURE_SLOTS.base]: "ベーステクスチャ",
    [TEXTURE_SLOTS.camera]: "カメラテクスチャ",
};

export type TexturePickerProps = {
    slot?: TextureSlot;
    state: TextureSlotState;
    presets: TexturePreset[];
    onSelectFile: (file: File) => void | Promise<void>;
    onSelectPreset: (presetId: string) => void | Promise<void>;
    onClear: () => void;
};

export function TexturePicker({
    slot = TEXTURE_SLOTS.base,
    state,
    presets,
    onSelectFile,
    onSelectPreset,
    onClear,
}: TexturePickerProps): JSX.Element {
    const inputId = useId();
    const [selectedPreset, setSelectedPreset] = useState<string>("");

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            void onSelectFile(file);
            event.target.value = "";
            setSelectedPreset("");
        }
    };

    const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setSelectedPreset(value);
        if (value) {
            void onSelectPreset(value);
        }
    };

    const handleClear = () => {
        onClear();
        setSelectedPreset("");
    };

    const statusLabel = (() => {
        switch (state.status) {
            case "loading":
                return "読み込み中";
            case "ready":
                return "使用中";
            case "error":
                return state.error ?? "エラー";
            default:
                return "未設定";
        }
    })();

    const hasTexture = Boolean(state.layer);

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
            <legend style={{ fontWeight: 600 }}>{SLOT_LABELS[slot]}</legend>
            <label style={{ display: "grid", gap: "4px" }} htmlFor={inputId}>
                <span style={{ fontSize: "0.875rem" }}>画像ファイルを選択</span>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={state.status === "loading"}
                />
            </label>
            <label style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontSize: "0.875rem" }}>プリセット</span>
                <select
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    disabled={state.status === "loading"}
                    style={{ padding: "4px", borderRadius: "4px" }}
                >
                    <option value="">未選択</option>
                    {presets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                            {preset.label}
                        </option>
                    ))}
                </select>
            </label>
            <div
                style={{
                    fontSize: "0.8125rem",
                    color: state.status === "error" ? "#d32f2f" : "#4b5563",
                }}
            >
                ステータス: {statusLabel}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={!hasTexture && state.status !== "error"}
                    style={{
                        padding: "6px 12px",
                        borderRadius: "4px",
                        border: "1px solid #d0d7de",
                        background: "#f6f8fa",
                        cursor: hasTexture || state.status === "error" ? "pointer" : "not-allowed",
                    }}
                >
                    クリア
                </button>
            </div>
        </fieldset>
    );
}
