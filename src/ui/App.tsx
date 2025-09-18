import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { buildTiling, type TilingParams } from "../geom/tiling";
import { normalizeDepth, validateTriangleParams } from "../geom/triangleParams";
import { attachResize, setCanvasDPR } from "../render/canvas";
import { drawCircle, drawLine } from "../render/canvasAdapter";
import { geodesicSpec, unitDiskSpec } from "../render/primitives";
import { facesToEdgeGeodesics } from "../render/tilingAdapter";
import type { Viewport } from "../render/viewport";

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [formInputs, setFormInputs] = useState({ p: "2", q: "3", r: "7" });
    const [params, setParams] = useState<TilingParams>({ p: 2, q: 3, r: 7, depth: 2 });
    const [paramError, setParamError] = useState<string | null>(null);
    const depthRange = { min: 0, max: 10 } as const;

    const handleParamChange = (key: "p" | "q" | "r") => (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setFormInputs((prev) => ({ ...prev, [key]: value }));
    };

    const updateDepth = (value: number) => {
        setParams((prev) => {
            const nextDepth = normalizeDepth(value);
            if (prev.depth === nextDepth) return prev;
            return { ...prev, depth: nextDepth };
        });
    };

    useEffect(() => {
        const numeric = {
            p: Number(formInputs.p),
            q: Number(formInputs.q),
            r: Number(formInputs.r),
        };

        const result = validateTriangleParams(numeric);
        if (result.ok) {
            setParams((prev) => {
                if (prev.p === numeric.p && prev.q === numeric.q && prev.r === numeric.r) {
                    return prev;
                }
                return { ...prev, ...numeric };
            });
            setParamError(null);
        } else {
            setParamError(result.errors[0] ?? "Invalid parameters");
        }
    }, [formInputs]);

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

            const { faces } = buildTiling(params);
            const edges = facesToEdgeGeodesics(faces);
            for (const e of edges) {
                const spec = geodesicSpec(e.geodesic, vp);
                if ("r" in spec) {
                    drawCircle(ctx, spec, { strokeStyle: "#4a90e2", lineWidth: 1 });
                } else {
                    drawLine(ctx, spec, { strokeStyle: "#4a90e2", lineWidth: 1 });
                }
            }
        };

        render();
        const detach = attachResize(cv, render);
        return () => detach();
    }, [params]);

    return (
        <div
            style={{
                boxSizing: "border-box",
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "minmax(220px, 320px) 1fr",
                height: "100%",
                padding: "16px",
                width: "100%",
            }}
        >
            <div style={{ display: "grid", gap: "12px", alignContent: "start" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Triangle Parameters</h2>
                <div style={{ display: "grid", gap: "8px" }}>
                    {(["p", "q", "r"] as const).map((key) => (
                        <label key={key} style={{ display: "grid", gap: "4px" }}>
                            <span style={{ fontWeight: 600 }}>{key.toUpperCase()}</span>
                            <input
                                type="number"
                                min={2}
                                step={1}
                                value={formInputs[key]}
                                onChange={handleParamChange(key)}
                            />
                        </label>
                    ))}
                </div>
                <p style={{ margin: 0, color: paramError ? "#c0392b" : "#555" }}>
                    {paramError ?? "Constraint: 1/p + 1/q + 1/r < 1"}
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#555" }}>
                    Current: ({params.p}, {params.q}, {params.r})
                </p>
                <div style={{ display: "grid", gap: "8px" }}>
                    <label style={{ display: "grid", gap: "4px" }}>
                        <span style={{ fontWeight: 600 }}>Depth (slider)</span>
                        <input
                            type="range"
                            min={depthRange.min}
                            max={depthRange.max}
                            step={1}
                            value={params.depth}
                            onChange={(event) => updateDepth(Number(event.target.value))}
                        />
                    </label>
                    <label style={{ display: "grid", gap: "4px" }}>
                        <span style={{ fontWeight: 600 }}>Depth (exact)</span>
                        <input
                            type="number"
                            min={depthRange.min}
                            max={depthRange.max}
                            step={1}
                            value={params.depth}
                            onChange={(event) => {
                                const numeric = Number(event.target.value);
                                if (Number.isFinite(numeric)) {
                                    updateDepth(numeric);
                                }
                            }}
                        />
                    </label>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#555" }}>
                        Depth range: {depthRange.min} – {depthRange.max}
                    </p>
                </div>
            </div>
            <div style={{ display: "grid", placeItems: "center" }}>
                {/* biome-ignore lint/correctness/useUniqueElementIds: Canvas host id is part of public API */}
                <canvas
                    id="stage"
                    ref={canvasRef}
                    width={800}
                    height={600}
                    style={{ border: "1px solid #ccc" }}
                />
            </div>
        </div>
    );
}
