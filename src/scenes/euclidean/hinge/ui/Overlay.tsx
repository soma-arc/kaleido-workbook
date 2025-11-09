import type { HingePlaneAngles } from "../math";

const VALUE_STYLE = {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.65)",
    color: "#f8fafc",
    fontSize: "1rem",
    fontWeight: 600,
    minWidth: "80px",
    textAlign: "center" as const,
} as const;

function formatAngle(value: number | null): string {
    if (value === null || Number.isNaN(value)) {
        return "--";
    }
    return `${value.toFixed(1)}°`;
}

export type HingeAnglesOverlayProps = {
    data?: HingePlaneAngles;
};

export function HingeAnglesOverlay({ data }: HingeAnglesOverlayProps): JSX.Element {
    const hingeAngle = data?.hingeAngle ?? null;
    return (
        <div style={VALUE_STYLE} data-testid="hinge-angle">
            {formatAngle(hingeAngle)}
        </div>
    );
}
