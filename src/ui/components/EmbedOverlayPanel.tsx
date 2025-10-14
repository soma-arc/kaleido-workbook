import type { PropsWithChildren, ReactNode } from "react";

export type EmbedOverlayPanelProps = PropsWithChildren<{
    title: string;
    subtitle?: string;
    footer?: ReactNode;
}>;

/**
 * Provides a consistent layout for embed-mode overlay cards.
 */
export function EmbedOverlayPanel({
    title,
    subtitle,
    children,
    footer,
}: EmbedOverlayPanelProps): JSX.Element {
    return (
        <div style={{ display: "grid", gap: "10px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {subtitle ? (
                    <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>{subtitle}</span>
                ) : null}
                <strong style={{ fontSize: "1rem" }}>{title}</strong>
            </div>
            {children}
            {footer ? (
                <div style={{ fontSize: "0.8rem", lineHeight: 1.4, opacity: 0.8 }}>{footer}</div>
            ) : null}
        </div>
    );
}
