import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import {
    normalizeVec3,
    type SphericalSceneState,
    type SphericalTriangle,
    type SphericalVertex,
} from "@/geom/spherical/types";
import { SphericalOrbitCamera } from "@/render/spherical/camera";
import { createSphericalRenderer, type SphericalRenderer } from "@/render/spherical/renderer";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { ModeControls } from "../components/ModeControls";
import { SceneLayout } from "./layouts";
import type { SceneDefinition, SceneId } from "./types";

export type SphericalSceneHostProps = {
    scene: SceneDefinition;
    scenes: SceneDefinition[];
    activeSceneId: SceneId;
    onSceneChange: (sceneId: SceneId) => void;
    embed?: boolean;
};

type VertexAngles = {
    azimuthDeg: number;
    elevationDeg: number;
};

type ViewportSize = {
    width: number;
    height: number;
};

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;
const DEFAULT_SAMPLES = 4;

function cloneTriangle(triangle: SphericalTriangle): SphericalTriangle {
    return {
        vertices: triangle.vertices.map((vertex) => ({
            ...vertex,
        })) as SphericalTriangle["vertices"],
    };
}

function initialStateFromScene(scene: SceneDefinition): SphericalSceneState {
    if (scene.initialSphericalState) {
        return {
            triangle: cloneTriangle(scene.initialSphericalState.triangle),
            handles: { ...scene.initialSphericalState.handles },
        };
    }
    return {
        triangle: createRegularTetrahedronTriangle(),
        handles: {},
    };
}

function vertexToAngles(vertex: SphericalVertex): VertexAngles {
    const azimuthDeg = Math.atan2(vertex.x, vertex.z) * DEG_PER_RAD;
    const elevationDeg = Math.asin(Math.max(-1, Math.min(1, vertex.y))) * DEG_PER_RAD;
    return {
        azimuthDeg,
        elevationDeg,
    };
}

function triangleToAngles(triangle: SphericalTriangle): VertexAngles[] {
    return triangle.vertices.map(vertexToAngles);
}

function anglesToVertex(angles: VertexAngles): SphericalVertex {
    const az = angles.azimuthDeg * RAD_PER_DEG;
    const el = angles.elevationDeg * RAD_PER_DEG;
    const cosEl = Math.cos(el);
    return normalizeVec3({
        x: Math.sin(az) * cosEl,
        y: Math.sin(el),
        z: Math.cos(az) * cosEl,
    });
}

function syncCanvasSize(canvas: HTMLCanvasElement): ViewportSize {
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssWidth = rect.width || canvas.clientWidth || canvas.width || 1;
    const cssHeight = rect.height || canvas.clientHeight || canvas.height || 1;
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    const cssWidthPx = `${Math.max(1, Math.round(cssWidth))}px`;
    const cssHeightPx = `${Math.max(1, Math.round(cssHeight))}px`;
    const shouldLockWidth = !canvas.style.width || canvas.style.width.endsWith("px");
    const shouldLockHeight = !canvas.style.height || canvas.style.height.endsWith("px");
    if (shouldLockWidth && canvas.style.width !== cssWidthPx) {
        canvas.style.width = cssWidthPx;
    }
    if (shouldLockHeight && canvas.style.height !== cssHeightPx) {
        canvas.style.height = cssHeightPx;
    }
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    return { width, height };
}

export function SphericalSceneHost({
    scene,
    scenes,
    activeSceneId,
    onSceneChange,
    embed = false,
}: SphericalSceneHostProps) {
    if (scene.geometry !== GEOMETRY_KIND.spherical) {
        throw new Error("SphericalSceneHost requires a spherical scene definition");
    }
    const memoInitialState = useMemo(() => initialStateFromScene(scene), [scene]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<SphericalRenderer | null>(null);
    const renderSceneRef = useRef<() => void>(() => {});
    const cameraRef = useRef<SphericalOrbitCamera>(new SphericalOrbitCamera());
    const [state, setState] = useState<SphericalSceneState>(memoInitialState);
    const [anglesState, setAnglesState] = useState<VertexAngles[]>(() =>
        triangleToAngles(memoInitialState.triangle),
    );
    const [samples, setSamples] = useState<number>(DEFAULT_SAMPLES);
    const [dragging, setDragging] = useState(false);
    const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
    const [renderBackend, setRenderBackend] = useState<string>("initialising");

    const controlsVisible = !embed;

    useEffect(() => {
        const nextState = initialStateFromScene(scene);
        setState(nextState);
        setAnglesState(triangleToAngles(nextState.triangle));
        cameraRef.current = new SphericalOrbitCamera();
    }, [scene]);

    const renderScene = useCallback(() => {
        const canvas = canvasRef.current;
        const renderer = rendererRef.current;
        if (!canvas || !renderer) return;
        const viewport = syncCanvasSize(canvas);
        renderer.render({
            triangle: state.triangle,
            camera: cameraRef.current,
            viewport,
            settings: { samples },
        });
    }, [samples, state]);

    useEffect(() => {
        renderScene();
    }, [renderScene]);

    useEffect(() => {
        renderSceneRef.current = renderScene;
    }, [renderScene]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const renderer = createSphericalRenderer(canvas);
        rendererRef.current = renderer;
        setRenderBackend(renderer.ready ? "webgl2" : "fallback");
        let resize: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resize = new ResizeObserver(() => {
                renderSceneRef.current();
            });
            resize.observe(canvas);
        }
        return () => {
            if (resize) {
                resize.disconnect();
            }
            renderer.dispose();
            rendererRef.current = null;
        };
    }, []);

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            if (!pointerOrigin.current) return;
            const { x, y } = pointerOrigin.current;
            const deltaX = event.clientX - x;
            const deltaY = event.clientY - y;
            pointerOrigin.current = { x: event.clientX, y: event.clientY };
            const AZIMUTH_FACTOR = 0.005;
            const ELEVATION_FACTOR = 0.005;
            cameraRef.current.orbit(-deltaX * AZIMUTH_FACTOR, -deltaY * ELEVATION_FACTOR);
            renderScene();
        },
        [renderScene],
    );

    const handlePointerUp = useCallback(() => {
        pointerOrigin.current = null;
        setDragging(false);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handlePointerDown = (event: PointerEvent) => {
            canvas.setPointerCapture(event.pointerId);
            pointerOrigin.current = { x: event.clientX, y: event.clientY };
            setDragging(true);
        };

        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointermove", handlePointerMove);
        canvas.addEventListener("pointerup", handlePointerUp);
        canvas.addEventListener("pointercancel", handlePointerUp);
        canvas.addEventListener("lostpointercapture", handlePointerUp);

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            const delta = event.deltaY > 0 ? 0.5 : -0.5;
            cameraRef.current.zoom(delta);
            renderSceneRef.current();
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener("pointerdown", handlePointerDown);
            canvas.removeEventListener("pointermove", handlePointerMove);
            canvas.removeEventListener("pointerup", handlePointerUp);
            canvas.removeEventListener("pointercancel", handlePointerUp);
            canvas.removeEventListener("lostpointercapture", handlePointerUp);
            canvas.removeEventListener("wheel", handleWheel);
        };
    }, [handlePointerMove, handlePointerUp]);

    const updateVertex = useCallback((index: number, nextAngles: VertexAngles) => {
        setState((prev) => {
            const nextTriangle = cloneTriangle(prev.triangle);
            nextTriangle.vertices[index] = anglesToVertex(nextAngles);
            return { ...prev, triangle: nextTriangle };
        });
        setAnglesState((prev) => {
            const next = [...prev];
            next[index] = nextAngles;
            return next;
        });
    }, []);

    useEffect(() => {
        renderScene();
    }, [renderScene]);

    const handleSampleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSamples(Number(event.target.value));
    }, []);

    const controls = controlsVisible ? (
        <>
            <ModeControls
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSceneChange={onSceneChange}
                renderBackend={renderBackend}
            />
            <section style={{ display: "grid", gap: "12px" }}>
                <header>
                    <h2 style={{ margin: 0, fontSize: "1rem" }}>{scene.label}</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#555" }}>
                        Drag to orbit, scroll to zoom, edit vertex angles below.
                    </p>
                    {dragging ? (
                        <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#4a90e2" }}>
                            Rotating…
                        </p>
                    ) : null}
                </header>
                <div style={{ display: "grid", gap: "12px" }}>
                    {anglesState.map((angles, index) => {
                        const label = String.fromCharCode(65 + index);
                        return (
                            <div
                                key={`vertex-${label}`}
                                style={{
                                    border: "1px solid #d0d4dd",
                                    borderRadius: "8px",
                                    padding: "8px",
                                    display: "grid",
                                    gap: "6px",
                                }}
                            >
                                <strong>Vertex {label}</strong>
                                <label style={{ display: "grid", gap: "4px", fontSize: "0.85rem" }}>
                                    Azimuth (°)
                                    <input
                                        data-testid={`vertex-${index}-azimuth`}
                                        type="number"
                                        min={-180}
                                        max={180}
                                        step={1}
                                        value={Math.round(angles.azimuthDeg * 100) / 100}
                                        onChange={(event) => {
                                            const value = Number(event.target.value);
                                            updateVertex(index, {
                                                azimuthDeg: value,
                                                elevationDeg: angles.elevationDeg,
                                            });
                                        }}
                                    />
                                </label>
                                <label style={{ display: "grid", gap: "4px", fontSize: "0.85rem" }}>
                                    Elevation (°)
                                    <input
                                        data-testid={`vertex-${index}-elevation`}
                                        type="number"
                                        min={-89}
                                        max={89}
                                        step={1}
                                        value={Math.round(angles.elevationDeg * 100) / 100}
                                        onChange={(event) => {
                                            const value = Number(event.target.value);
                                            updateVertex(index, {
                                                azimuthDeg: angles.azimuthDeg,
                                                elevationDeg: value,
                                            });
                                        }}
                                    />
                                </label>
                                <span
                                    data-testid={`vertex-${index}-summary`}
                                    style={{ fontSize: "0.8rem", color: "#666" }}
                                >
                                    Azimuth {Math.round(angles.azimuthDeg)}° / Elevation{" "}
                                    {Math.round(angles.elevationDeg)}°
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        Anti-aliasing samples
                        <select
                            data-testid="aa-samples"
                            value={samples}
                            onChange={handleSampleChange}
                            style={{ marginTop: "4px" }}
                        >
                            <option value={1}>1x (off)</option>
                            <option value={2}>2x</option>
                            <option value={4}>4x</option>
                            <option value={8}>8x</option>
                        </select>
                    </label>
                </div>
            </section>
        </>
    ) : null;

    const canvas = (
        <StageCanvas
            ref={canvasRef}
            style={{
                border: "none",
                width: "100%",
                height: "100%",
                cursor: dragging ? "grabbing" : "grab",
            }}
            data-geometry={GEOMETRY_KIND.spherical}
        />
    );

    return <SceneLayout controls={controls} canvas={canvas} embed={embed} />;
}
