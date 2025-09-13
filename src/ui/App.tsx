import { useEffect, useRef } from "react";

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        // simple placeholder fill to visualize the canvas region
        const ctx = cv.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.fillStyle = "#f5f5f5";
            ctx.fillRect(0, 0, cv.width, cv.height);
            ctx.fillStyle = "#555";
            ctx.font = "14px sans-serif";
            ctx.fillText("Canvas stage", 12, 24);
        }
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
