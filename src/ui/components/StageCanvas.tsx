import { forwardRef } from "react";

export type StageCanvasProps = {
    width: number;
    height: number;
    id?: string;
};

export const StageCanvas = forwardRef<HTMLCanvasElement, StageCanvasProps>(function StageCanvas(
    { width, height, id = "stage" },
    ref,
) {
    return (
        <canvas
            id={id}
            ref={ref}
            width={width}
            height={height}
            style={{ border: "1px solid #ccc" }}
        />
    );
});
