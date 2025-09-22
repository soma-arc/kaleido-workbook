import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { TilingParams } from "../geom/tiling";
import { normalizeDepth, validateTriangleParams } from "../geom/triangleParams";
import { type PqrKey, snapTriangleParams, type TriangleTriple } from "../geom/triangleSnap";
import { createRenderEngine, detectRenderMode, type RenderEngine } from "../render/engine";

const TRIANGLE_N_MAX = 100;

const PQR_PRESETS = [
    { label: "(3,3,3)", p: 3, q: 3, r: 3 },
    { label: "(2,4,6)", p: 2, q: 4, r: 6 },
    { label: "(2,3,6)", p: 2, q: 3, r: 6 },
];

export function App(): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [formInputs, setFormInputs] = useState({ p: "2", q: "3", r: "7" });
    const [params, setParams] = useState<TilingParams>({ p: 2, q: 3, r: 7, depth: 2 });
    const [paramError, setParamError] = useState<string | null>(null);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [anchor, setAnchor] = useState<{ p: number; q: number } | null>({ p: 2, q: 3 });
    const [preservePresetDisplay, setPreservePresetDisplay] = useState(false);
    const [renderMode] = useState(() => detectRenderMode());
    const renderEngineRef = useRef<RenderEngine | null>(null);
    const depthRange = { min: 0, max: 10 } as const;
    const rRange = { min: 2, max: TRIANGLE_N_MAX } as const;
    const parsedR = Number(formInputs.r);
    const rSliderValue = Number.isFinite(parsedR) ? parsedR : params.r;
    const rStep = snapEnabled ? 1 : 0.1;

    const handleParamChange = (key: PqrKey) => (event: ChangeEvent<HTMLInputElement>) => {
        if (anchor && key !== "r") {
            return;
        }
        const { value } = event.target;
        setFormInputs((prev) => ({ ...prev, [key]: value }));
    };

    const setFromPreset = (preset: { p: number; q: number; r: number }) => {
        setAnchor({ p: preset.p, q: preset.q });
        setPreservePresetDisplay(true);
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
        const parsed: TriangleTriple = {
            p: Number(formInputs.p),
            q: Number(formInputs.q),
            r: Number(formInputs.r),
        };

        const snapped = snapEnabled
            ? snapTriangleParams(parsed, {
                  nMax: TRIANGLE_N_MAX,
                  locked: anchor ? { p: true, q: true } : undefined,
              })
            : parsed;

        if (snapEnabled && !preservePresetDisplay) {
            const nextInputs: Record<PqrKey, string> = {
                p: String(snapped.p),
                q: String(snapped.q),
                r: String(snapped.r),
            };

            const changed = (["p", "q", "r"] as const).some(
                (key) => nextInputs[key] !== formInputs[key],
            );
            if (changed) {
                setFormInputs(nextInputs as typeof formInputs);
                return;
            }
        }

        const result = validateTriangleParams(snapped, { requireIntegers: snapEnabled });
        if (result.ok) {
            setParams((prev) => {
                if (prev.p === snapped.p && prev.q === snapped.q && prev.r === snapped.r) {
                    return prev;
                }
                return { ...prev, ...snapped };
            });
            setParamError(null);
            if (preservePresetDisplay) {
                setPreservePresetDisplay(false);
            }
        } else {
            setParamError(result.errors[0] ?? "Invalid parameters");
        }
    }, [formInputs, snapEnabled, anchor, preservePresetDisplay]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = createRenderEngine(canvas, { mode: renderMode });
        renderEngineRef.current = engine;
        return () => {
            renderEngineRef.current = null;
            engine.dispose();
        };
    }, [renderMode]);

    useEffect(() => {
        renderEngineRef.current?.render(params);
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
                    <span style={{ fontSize: "0.8rem", color: "#555" }}>
                        Render mode: {renderMode}
                    </span>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                    {(["p", "q", "r"] as const).map((key) => {
                        const isR = key === "r";
                        return (
                            <label key={key} style={{ display: "grid", gap: "4px" }}>
                                <span style={{ fontWeight: 600 }}>{key.toUpperCase()}</span>
                                <input
                                    type="number"
                                    min={2}
                                    max={isR ? rRange.max : undefined}
                                    step={isR ? rStep : 1}
                                    disabled={Boolean(anchor) && key !== "r"}
                                    value={formInputs[key]}
                                    onChange={handleParamChange(key)}
                                />
                            </label>
                        );
                    })}
                </div>
                <label style={{ display: "grid", gap: "4px" }}>
                    <span style={{ fontWeight: 600 }}>R (slider)</span>
                    <input
                        type="range"
                        min={rRange.min}
                        max={rRange.max}
                        step={rStep}
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
