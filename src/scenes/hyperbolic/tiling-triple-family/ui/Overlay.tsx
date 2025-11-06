import { useMemo } from "react";

type FamilyOption = {
    key: string;
    label: string;
    p: number;
    q: number;
};

const FAMILY_OPTIONS: FamilyOption[] = [
    { key: "333", label: "(3, 3, r)", p: 3, q: 3 },
    { key: "24r", label: "(2, 4, r)", p: 2, q: 4 },
    { key: "23r", label: "(2, 3, r)", p: 2, q: 3 },
];

export type HyperbolicTripleFamilyOverlayProps = {
    activeFamily: { p: number; q: number };
    onSelectFamily: (family: { p: number; q: number }) => void;
    rSlider: {
        id: string;
        min: number;
        max: number;
        step: number;
        value: number;
        onChange: (value: number) => void;
    };
};

const CONTAINER_STYLE = {
    display: "grid",
    gap: "12px",
    minWidth: 200,
} as const;

const FAMILY_LIST_STYLE = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
} as const;

const FAMILY_OPTION_STYLE = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    background: "rgba(255, 255, 255, 0.08)",
    color: "inherit",
    fontSize: "0.85rem",
    cursor: "pointer",
    userSelect: "none" as const,
    position: "relative" as const,
} as const;

const FAMILY_OPTION_ACTIVE_STYLE = {
    ...FAMILY_OPTION_STYLE,
    border: "1px solid rgba(255, 255, 255, 0.65)",
    background: "rgba(255, 255, 255, 0.16)",
    fontWeight: 600,
} as const;

const FAMILY_OPTION_INPUT_STYLE = {
    position: "absolute",
    inset: 0,
    opacity: 0,
} as const;

const SLIDER_SECTION_STYLE = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
} as const;

const SLIDER_VALUE_STYLE = {
    fontSize: "0.85rem",
    minWidth: "4ch",
    textAlign: "right" as const,
} as const;

function formatR(value: number): string {
    if (!Number.isFinite(value)) {
        return "-";
    }
    return value.toFixed(1);
}

export function HyperbolicTripleFamilyOverlay({
    activeFamily,
    onSelectFamily,
    rSlider,
}: HyperbolicTripleFamilyOverlayProps): JSX.Element {
    const activeKey = useMemo(() => {
        const match = FAMILY_OPTIONS.find(
            (option) => option.p === activeFamily.p && option.q === activeFamily.q,
        );
        return match?.key ?? FAMILY_OPTIONS[0]?.key ?? "333";
    }, [activeFamily]);

    const radioName = useMemo(() => `${rSlider.id}-family`, [rSlider.id]);

    return (
        <div style={CONTAINER_STYLE}>
            <div
                role="radiogroup"
                aria-label="Triple reflection families"
                style={FAMILY_LIST_STYLE}
            >
                {FAMILY_OPTIONS.map((option) => {
                    const selected = option.key === activeKey;
                    return (
                        <label
                            key={option.key}
                            style={selected ? FAMILY_OPTION_ACTIVE_STYLE : FAMILY_OPTION_STYLE}
                        >
                            <input
                                type="radio"
                                name={radioName}
                                value={option.key}
                                checked={selected}
                                onChange={() => onSelectFamily({ p: option.p, q: option.q })}
                                style={FAMILY_OPTION_INPUT_STYLE}
                                aria-label={option.label}
                            />
                            {option.label}
                        </label>
                    );
                })}
            </div>
            <div style={SLIDER_SECTION_STYLE}>
                <input
                    id={rSlider.id}
                    type="range"
                    min={rSlider.min}
                    max={rSlider.max}
                    step={rSlider.step}
                    value={rSlider.value}
                    onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        if (Number.isFinite(nextValue)) {
                            rSlider.onChange(nextValue);
                        }
                    }}
                    aria-label="Adjust r value"
                    aria-valuemin={rSlider.min}
                    aria-valuemax={rSlider.max}
                    aria-valuenow={rSlider.value}
                />
                <span style={SLIDER_VALUE_STYLE}>{formatR(rSlider.value)}</span>
            </div>
        </div>
    );
}

export type HyperbolicTripleFamilyOverlayExtras = {
    tripleFamilyControls?: HyperbolicTripleFamilyOverlayProps;
};
