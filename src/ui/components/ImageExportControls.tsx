import { type ChangeEvent, useId } from "react";

export type ImageExportMode = "webgl" | "composite";

export type ImageExportStatus = { tone: "info" | "warning" | "error"; message: string } | null;

export type ImageExportControlsProps = {
    mode: ImageExportMode;
    onModeChange: (mode: ImageExportMode) => void;
    onExport: () => void;
    disabled?: boolean;
    status?: ImageExportStatus;
};

const STATUS_COLOR: Record<Exclude<ImageExportStatus, null>["tone"], string> = {
    info: "#2563eb",
    warning: "#d97706",
    error: "#dc2626",
};

export function ImageExportControls({
    mode,
    onModeChange,
    onExport,
    disabled = false,
    status = null,
}: ImageExportControlsProps): JSX.Element {
    const radioGroupId = useId();
    const handleRadioChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextMode = event.target.value === "webgl" ? "webgl" : "composite";
        onModeChange(nextMode);
    };

    return (
        <fieldset style={{ border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px" }}>
            <legend style={{ padding: "0 4px", fontSize: "0.9rem" }}>画像保存</legend>
            <div
                style={{
                    display: "grid",
                    gap: "4px",
                    marginBottom: "8px",
                }}
            >
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="radio"
                        name={`image-export-mode-${radioGroupId}`}
                        value="webgl"
                        checked={mode === "webgl"}
                        onChange={handleRadioChange}
                    />
                    <span>WebGL のみ</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="radio"
                        name={`image-export-mode-${radioGroupId}`}
                        value="composite"
                        checked={mode === "composite"}
                        onChange={handleRadioChange}
                    />
                    <span>WebGL + Canvas 合成</span>
                </label>
            </div>
            <button type="button" onClick={onExport} disabled={disabled}>
                PNG を保存
            </button>
            {status ? (
                <p
                    aria-live="polite"
                    style={{
                        marginTop: "8px",
                        fontSize: "0.85rem",
                        color: STATUS_COLOR[status.tone],
                    }}
                >
                    {status.message}
                </p>
            ) : null}
        </fieldset>
    );
}
