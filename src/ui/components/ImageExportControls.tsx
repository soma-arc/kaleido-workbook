import { type ChangeEvent, useId } from "react";

export type ImageExportMode = "composite" | "webgl" | "square-composite" | "square-webgl";

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

const MODE_LABELS: Record<ImageExportMode, string> = {
    composite: "フル（合成）",
    webgl: "フル（WebGL のみ）",
    "square-composite": "正方形（合成）",
    "square-webgl": "正方形（WebGL 優先）",
};

export function ImageExportControls({
    mode,
    onModeChange,
    onExport,
    disabled = false,
    status = null,
}: ImageExportControlsProps): JSX.Element {
    const selectId = useId();
    const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value as ImageExportMode;
        onModeChange(value);
    };

    return (
        <fieldset style={{ border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px" }}>
            <legend style={{ padding: "0 4px", fontSize: "0.9rem" }}>画像保存</legend>
            <label
                htmlFor={selectId}
                style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", fontWeight: 600 }}
            >
                保存モード
            </label>
            <select
                id={selectId}
                name="image-export-mode"
                value={mode}
                onChange={handleSelectChange}
                disabled={disabled}
                style={{ width: "100%", marginBottom: 8 }}
            >
                {(Object.keys(MODE_LABELS) as ImageExportMode[]).map((option) => (
                    <option key={option} value={option}>
                        {MODE_LABELS[option]}
                    </option>
                ))}
            </select>
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
