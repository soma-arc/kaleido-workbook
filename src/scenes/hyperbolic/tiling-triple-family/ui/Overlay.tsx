import { useMemo } from "react";
import {
    HyperbolicTiling333TriangleSlider,
    type HyperbolicTiling333TriangleSliderProps,
} from "@/scenes/hyperbolic/tiling-333/ui/Controls";

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
    rSlider: HyperbolicTiling333TriangleSliderProps;
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
    display: "grid",
    gap: "6px",
} as const;

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

    const radioName = useMemo(() => `${rSlider.sliderId}-family`, [rSlider.sliderId]);

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
                <HyperbolicTiling333TriangleSlider {...rSlider} />
            </div>
        </div>
    );
}

export type HyperbolicTripleFamilyOverlayExtras = {
    tripleFamilyControls?: HyperbolicTripleFamilyOverlayProps;
};
