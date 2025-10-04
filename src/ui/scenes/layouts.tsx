import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { STANDARD_CANVAS_HEIGHT, STANDARD_CANVAS_WIDTH } from "./canvasLayout";

export type SceneLayoutProps = {
    controls: ReactNode;
    canvas: ReactNode;
    embed?: boolean;
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

const CANVAS_FRAME_EMBED_STYLE: CSSProperties = {
    ...CANVAS_FRAME_STYLE,
    width: "100%",
    height: "auto",
    maxWidth: `${STANDARD_CANVAS_WIDTH}px`,
    aspectRatio: "16 / 9",
    boxShadow: "0 12px 32px rgba(15,23,42,0.45)",
};

export function SceneLayout({ controls, canvas, embed }: SceneLayoutProps): JSX.Element {
    if (embed) {
        return (
            <div
                style={{
                    ...BASE_CONTAINER_STYLE,
                    justifyItems: "center",
                    alignItems: "center",
                    padding: "24px",
                }}
            >
                <div style={CANVAS_FRAME_EMBED_STYLE}>{canvas}</div>
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
            <div style={CANVAS_FRAME_STYLE}>{canvas}</div>
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
