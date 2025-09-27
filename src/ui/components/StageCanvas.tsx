import { type ComponentPropsWithoutRef, forwardRef } from "react";

type CanvasProps = ComponentPropsWithoutRef<"canvas">;

export type StageCanvasProps = {
    width: number;
    height: number;
    id?: string;
} & Omit<CanvasProps, "width" | "height" | "ref" | "id">;

export const StageCanvas = forwardRef<HTMLCanvasElement, StageCanvasProps>(function StageCanvas(
    { width, height, id = "stage", style, ...rest },
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
