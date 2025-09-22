import type { ChangeEvent } from "react";
import type { TilingParams } from "../../geom/tiling";
import type { PqrKey } from "../../geom/triangleSnap";

export type TriangleParamFormProps = {
    formInputs: Record<PqrKey, string>;
    params: TilingParams;
    anchor: { p: number; q: number } | null;
    paramError: string | null;
    rRange: { min: number; max: number };
    rStep: number;
    rSliderValue: number;
    onParamChange: (key: PqrKey, value: string) => void;
    onRSliderChange: (value: number) => void;
};

export function TriangleParamForm({
    formInputs,
    params,
    anchor,
    paramError,
    rRange,
    rStep,
    rSliderValue,
    onParamChange,
    onRSliderChange,
}: TriangleParamFormProps): JSX.Element {
    const handleParamChange = (key: PqrKey) => (event: ChangeEvent<HTMLInputElement>) => {
        onParamChange(key, event.target.value);
    };

    return (
        <div style={{ display: "grid", gap: "8px" }}>
            {(["p", "q", "r"] as const).map((key) => {
                const isR = key === "r";
                return (
                    <label key={key} style={{ display: "grid", gap: "4px" }}>
                        <span style={{ fontWeight: 600 }}>{key.toUpperCase()}</span>
                        <input
                            type="number"
                            min={2}
                            max={isR ? rRange.max : undefined}
                            step={isR ? rStep : 1}
                            disabled={Boolean(anchor) && key !== "r"}
                            value={formInputs[key]}
                            onInput={handleParamChange(key)}
                            onChange={handleParamChange(key)}
                        />
                    </label>
                );
            })}
            <label style={{ display: "grid", gap: "4px" }}>
                <span style={{ fontWeight: 600 }}>R (slider)</span>
                <input
                    type="range"
                    min={rRange.min}
                    max={rRange.max}
                    step={rStep}
                    value={rSliderValue}
                    onInput={(event) => onRSliderChange(Number(event.currentTarget.value))}
                    onChange={(event) => onRSliderChange(Number(event.currentTarget.value))}
                />
                <span style={{ fontSize: "0.8rem", color: "#555" }}>
                    Range: {rRange.min} – {rRange.max}
                </span>
            </label>
            <p style={{ margin: 0, color: paramError ? "#c0392b" : "#555" }}>
                {paramError ?? "Constraint: 1/p + 1/q + 1/r < 1"}
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#555" }}>
                Current: ({params.p}, {params.q}, {params.r})
            </p>
        </div>
    );
}
