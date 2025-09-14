import { useEffect, useRef } from "react";
import { setCanvasDPR, attachResize } from "../render/canvas";
import { type Viewport } from "../render/viewport";
import { unitDiskSpec } from "../render/primitives";
import { drawCircle } from "../render/canvasAdapter";

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext("2d");
        if (!ctx) return;

        const render = () => {
            setCanvasDPR(cv);
            const rect = cv.getBoundingClientRect();
            const size = Math.min(rect.width, rect.height);
            const margin = 8;
            const scale = Math.max(1, size / 2 - margin);
            const vp: Viewport = { scale, tx: rect.width / 2, ty: rect.height / 2 };

            ctx.clearRect(0, 0, cv.width, cv.height);
            const disk = unitDiskSpec(vp);
            drawCircle(ctx, disk, { strokeStyle: "#222", lineWidth: 1 });
        };

        render();
        const detach = attachResize(cv, render);
        return () => detach();
    }, []);

    // minimal fixed size; DPR handling will come later tasks
    return (
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            {/* biome-ignore lint/correctness/useUniqueElementIds: Canvas host id is part of public API */}
            <canvas
                id="stage"
                ref={canvasRef}
                width={800}
                height={600}
                style={{ border: "1px solid #ccc" }}
            />
        </div>
    );
}
