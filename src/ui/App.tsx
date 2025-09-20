import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { buildTiling, type TilingParams } from "../geom/tiling";
import { normalizeDepth, validateTriangleParams } from "../geom/triangleParams";
import { DEFAULT_PI_OVER_N_MAX, snapParameterToPiOverN } from "../geom/triangleSnap";
import { attachResize, setCanvasDPR } from "../render/canvas";
import { drawCircle, drawLine } from "../render/canvasAdapter";
import { geodesicSpec, unitDiskSpec } from "../render/primitives";
import { facesToEdgeGeodesics } from "../render/tilingAdapter";
import type { Viewport } from "../render/viewport";

const TRIANGLE_N_MAX = DEFAULT_PI_OVER_N_MAX;

const PQR_PRESETS = [
    { label: "(3,3,3)", p: 3, q: 3, r: 3 },
    { label: "(2,4,4)", p: 2, q: 4, r: 4 },
    { label: "(2,3,6)", p: 2, q: 3, r: 6 },
];

type PqrKey = "p" | "q" | "r";

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [formInputs, setFormInputs] = useState({ p: "2", q: "3", r: "7" });
    const [params, setParams] = useState<TilingParams>({ p: 2, q: 3, r: 7, depth: 2 });
    const [paramError, setParamError] = useState<string | null>(null);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [anchor, setAnchor] = useState<{ p: number; q: number } | null>({ p: 2, q: 3 });
    const depthRange = { min: 0, max: 10 } as const;
    const rRange = { min: 2, max: TRIANGLE_N_MAX } as const;
    const parsedR = Number(formInputs.r);
    const rSliderValue = Number.isFinite(parsedR) ? parsedR : params.r;

    const handleParamChange = (key: PqrKey) => (event: ChangeEvent<HTMLInputElement>) => {
        if (anchor && key !== "r") {
            return;
        }
        const { value } = event.target;
        setFormInputs((prev) => ({ ...prev, [key]: value }));
    };

    const setFromPreset = (preset: { p: number; q: number; r: number }) => {
        setAnchor({ p: preset.p, q: preset.q });
        setFormInputs({ p: String(preset.p), q: String(preset.q), r: String(preset.r) });
    };

    const clearAnchor = () => {
        setAnchor(null);
    };

    const updateDepth = (value: number) => {
        setParams((prev) => {
            const nextDepth = normalizeDepth(value);
            if (prev.depth === nextDepth) return prev;
            return { ...prev, depth: nextDepth };
        });
    };

    useEffect(() => {
        if (!anchor) return;
        setFormInputs((prev) => {
            const next = { ...prev, p: String(anchor.p), q: String(anchor.q) };
            if (prev.p === next.p && prev.q === next.q) {
                return prev;
            }
            return next;
        });
    }, [anchor]);

    useEffect(() => {
        const parsed = {
            p: Number(formInputs.p),
            q: Number(formInputs.q),
            r: Number(formInputs.r),
        } as Record<PqrKey, number>;

        const snapped = snapEnabled
            ? (Object.entries(parsed) as [PqrKey, number][]).reduce(
                  (acc, [key, value]) => {
                      const snappedValue = snapParameterToPiOverN(value, { nMax: TRIANGLE_N_MAX });
                      acc[key] = snappedValue;
                      return acc;
                  },
                  {} as Record<PqrKey, number>,
              )
            : parsed;

        if (snapEnabled) {
            const nextInputs: Record<PqrKey, string> = {
                p: String(snapped.p),
                q: String(snapped.q),
                r: String(snapped.r),
            };

            const changed = (["p", "q", "r"] as const).some(
                (key) => nextInputs[key] !== formInputs[key],
            );
            if (changed) {
                setFormInputs(nextInputs);
                return;
            }
        }

        const result = validateTriangleParams(snapped);
        if (result.ok) {
            setParams((prev) => {
                if (prev.p === snapped.p && prev.q === snapped.q && prev.r === snapped.r) {
                    return prev;
                }
                return { ...prev, ...snapped };
            });
            setParamError(null);
        } else {
            setParamError(result.errors[0] ?? "Invalid parameters");
        }
    }, [formInputs, snapEnabled]);

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
                    <div style={{ display: "grid", gap: "4px" }}>
                        <span style={{ fontWeight: 600 }}>Presets</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {PQR_PRESETS.map((preset) => {
                                const active =
                                    !!anchor && anchor.p === preset.p && anchor.q === preset.q;
                                return (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setFromPreset(preset)}
                                        style={{
                                            padding: "4px 8px",
                                            border: active ? "1px solid #4a90e2" : "1px solid #bbb",
                                            backgroundColor: active ? "#e6f1fc" : "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={clearAnchor}
                                style={{
                                    padding: "4px 8px",
                                    border: "1px solid #bbb",
                                    cursor: "pointer",
                                }}
                            >
                                Custom
                            </button>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#555" }}>
                            Anchor: {anchor ? `p=${anchor.p}, q=${anchor.q}` : "none"}
                        </span>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 600 }}>Snap π/n</span>
                        <input
                            type="checkbox"
                            checked={snapEnabled}
                            onChange={(event) => setSnapEnabled(event.target.checked)}
                        />
                    </label>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                    {(["p", "q", "r"] as const).map((key) => (
                        <label key={key} style={{ display: "grid", gap: "4px" }}>
                            <span style={{ fontWeight: 600 }}>{key.toUpperCase()}</span>
                            <input
                                type="number"
                                min={2}
                                step={1}
                                disabled={Boolean(anchor) && key !== "r"}
                                value={formInputs[key]}
                                onChange={handleParamChange(key)}
                            />
                        </label>
                    ))}
                </div>
                <label style={{ display: "grid", gap: "4px" }}>
                    <span style={{ fontWeight: 600 }}>R (slider)</span>
                    <input
                        type="range"
                        min={rRange.min}
                        max={rRange.max}
                        step={1}
                        value={rSliderValue}
                        onChange={(event) => {
                            const numeric = Number(event.target.value);
                            setFormInputs((prev) => ({ ...prev, r: String(numeric) }));
                        }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "#555" }}>
                        Range: {rRange.min} – {rRange.max}
                    </span>
                </label>
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
