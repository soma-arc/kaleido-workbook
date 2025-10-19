import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { STANDARD_CANVAS_HEIGHT, STANDARD_CANVAS_WIDTH } from "./canvasLayout";

export type SceneLayoutProps = {
    controls: ReactNode;
    canvas: ReactNode;
    embed?: boolean;
    overlay?: ReactNode;
};

const BASE_CONTAINER_STYLE: CSSProperties = {
    boxSizing: "border-box",
    display: "grid",
    gap: "16px",
    width: "100%",
};

const CANVAS_FRAME_STYLE: CSSProperties = {
    position: "relative",
    width: `${STANDARD_CANVAS_WIDTH}px`,
    height: `${STANDARD_CANVAS_HEIGHT}px`,
    borderRadius: 8,
    border: "1px solid #ccd0dc",
    overflow: "hidden",
    background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
};

const EMBED_FRAME_WIDTH = "var(--embed-frame-width, 100vw)";

const CANVAS_FRAME_EMBED_STYLE: CSSProperties = {
    ...CANVAS_FRAME_STYLE,
    boxSizing: "border-box",
    width: EMBED_FRAME_WIDTH,
    height: "auto",
    maxWidth: EMBED_FRAME_WIDTH,
    aspectRatio: "16 / 9",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    boxShadow: "0 12px 32px rgba(15,23,42,0.45)",
};

const EMBED_CONTAINER_STYLE: CSSProperties = {
    boxSizing: "border-box",
    width: EMBED_FRAME_WIDTH,
    margin: "0 auto",
    padding: 0,
    display: "block",
};

const EMBED_OVERLAY_STYLE: CSSProperties = {
    position: "absolute",
    top: 16,
    left: 16,
    right: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.65)",
    color: "#e2e8f0",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.35)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    width: "fit-content",
    maxWidth: "calc(100vw - 32px)",
    pointerEvents: "auto",
};

export function SceneLayout({ controls, canvas, embed, overlay }: SceneLayoutProps): JSX.Element {
    const overlayNode = overlay ? <div style={EMBED_OVERLAY_STYLE}>{overlay}</div> : null;
    if (embed) {
        return (
            <div style={EMBED_CONTAINER_STYLE}>
                <div style={{ position: "relative" }}>
                    <div style={CANVAS_FRAME_EMBED_STYLE}>{canvas}</div>
                    {overlayNode}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                ...BASE_CONTAINER_STYLE,
                gridTemplateColumns: "minmax(240px, 320px) auto",
                alignItems: "start",
                padding: "16px",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gap: "12px",
                    alignContent: "start",
                }}
            >
                {controls}
            </div>
            <div style={CANVAS_FRAME_STYLE}>
                {canvas}
                {overlayNode}
            </div>
        </div>
    );
}

export type CanvasSlotProps = PropsWithChildren<{ embed?: boolean; borderColor?: string }>;

export function CanvasSlot({ children, embed, borderColor }: CanvasSlotProps): JSX.Element {
    const style = embed
        ? CANVAS_FRAME_EMBED_STYLE
        : {
              ...CANVAS_FRAME_STYLE,
              border: `1px solid ${borderColor ?? "#ccd0dc"}`,
          };
    return <div style={style}>{children}</div>;
}
