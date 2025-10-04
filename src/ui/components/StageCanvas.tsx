import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { STANDARD_CANVAS_HEIGHT, STANDARD_CANVAS_WIDTH } from "@/ui/scenes/canvasLayout";

type CanvasProps = ComponentPropsWithoutRef<"canvas">;

export type StageCanvasProps = {
    width?: number;
    height?: number;
    id?: string;
} & Omit<CanvasProps, "width" | "height" | "ref" | "id">;

export const StageCanvas = forwardRef<HTMLCanvasElement, StageCanvasProps>(function StageCanvas(
    {
        width = STANDARD_CANVAS_WIDTH,
        height = STANDARD_CANVAS_HEIGHT,
        id = "stage",
        style,
        ...rest
    },
    ref,
) {
    return (
        <canvas
            id={id}
            ref={ref}
            width={width}
            height={height}
            style={{ border: "1px solid #ccc", ...(style ?? {}) }}
            {...rest}
        />
    );
});
