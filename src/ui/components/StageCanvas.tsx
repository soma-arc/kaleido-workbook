import { forwardRef } from "react";

export type StageCanvasProps = {
    width: number;
    height: number;
    id?: string;
    onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerMove?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerUp?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerCancel?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
};

export const StageCanvas = forwardRef<HTMLCanvasElement, StageCanvasProps>(function StageCanvas(
    { width, height, id = "stage", onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    ref,
) {
    return (
        <canvas
            id={id}
            ref={ref}
            width={width}
            height={height}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            style={{ border: "1px solid #ccc" }}
        />
    );
});
