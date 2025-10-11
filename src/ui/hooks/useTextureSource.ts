import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    IDENTITY_UV_TRANSFORM,
    type SceneTextureLayer,
    TEXTURE_SLOTS,
    type TextureLayer,
    type TextureSlot,
    type TextureSource,
    type TextureSourceKind,
    type TextureUVTransform,
} from "@/render/webgl/textures";
import type { TexturePreset } from "@/ui/texture/types";

export type TextureSlotState = {
    layer: TextureLayer | null;
    status: "idle" | "loading" | "ready" | "error";
    error: string | null;
};

type SlotStateMap = Record<TextureSlot, TextureSlotState>;

type SlotEntry = TextureSlotState;

type UseTextureInputOptions = {
    presets?: TexturePreset[];
};

type CanvasTextureOptions = {
    width?: number;
    height?: number;
    devicePixelRatio?: number;
    id?: string;
    transform?: TextureUVTransform;
    onCreate?: (canvas: HTMLCanvasElement) => void;
};

export type CanvasTextureHandle = {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
    resize: (width: number, height: number) => void;
};

export type UseTextureInputResult = {
    textures: TextureLayer[];
    sceneTextures: SceneTextureLayer[];
    slots: SlotStateMap;
    loadFile(slot: TextureSlot, file: File): Promise<void>;
    loadPreset(slot: TextureSlot, presetId: string): Promise<void>;
    enableCamera(slot?: TextureSlot): Promise<void>;
    enableCanvas(slot?: TextureSlot, options?: CanvasTextureOptions): CanvasTextureHandle;
    disable(slot: TextureSlot): void;
    setTransform(slot: TextureSlot, transform: TextureUVTransform): void;
    presets: TexturePreset[];
};

const DEFAULT_SLOT_STATE: TextureSlotState = {
    layer: null,
    status: "idle",
    error: null,
};

const ALL_SLOTS: TextureSlot[] = Object.values(TEXTURE_SLOTS);

/**
 * Manages texture slot lifecycle, covering image uploads, presets, and camera streams for WebGL pipelines.
 */
export function useTextureInput(options: UseTextureInputOptions = {}): UseTextureInputResult {
    const { presets = [] } = options;
    const [slots, setSlots] = useState<SlotStateMap>(() => {
        const initial: Partial<SlotStateMap> = {};
        for (const slot of ALL_SLOTS) {
            initial[slot] = { ...DEFAULT_SLOT_STATE };
        }
        return initial as SlotStateMap;
    });
    const activeStreams = useRef<Map<TextureSlot, () => void>>(new Map());
    const activeCanvasSources = useRef<Map<TextureSlot, TextureSource>>(new Map());
    const slotsRef = useRef<SlotStateMap>(slots);

    const disposeLayer = useCallback((slot: TextureSlot, layer: TextureLayer | null) => {
        if (!layer?.source) return;
        try {
            layer.source.onDispose?.();
        } catch (error) {
            console.warn("[TextureInput] Failed to dispose source", error);
        }
        activeStreams.current.delete(slot);
        activeCanvasSources.current.delete(slot);
    }, []);

    const setSlot = useCallback(
        (slot: TextureSlot, updater: (prev: SlotEntry) => SlotEntry) => {
            setSlots((prev) => {
                const current = prev[slot] ?? { ...DEFAULT_SLOT_STATE };
                const next = updater(current);
                if (current.layer && current.layer !== next.layer) {
                    disposeLayer(slot, current.layer);
                }
                return { ...prev, [slot]: next };
            });
        },
        [disposeLayer],
    );

    const loadImageElement = useCallback((url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.decoding = "async";
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
            image.src = url;
        });
    }, []);

    const createTextureLayer = useCallback(
        (
            slot: TextureSlot,
            source: TextureSource,
            kind: TextureSourceKind,
            transform: TextureUVTransform = IDENTITY_UV_TRANSFORM,
        ): TextureLayer => {
            return {
                slot,
                kind,
                enabled: true,
                opacity: 1,
                transform,
                source,
            };
        },
        [],
    );

    const loadFile = useCallback(
        async (slot: TextureSlot, file: File) => {
            const objectUrl = URL.createObjectURL(file);
            setSlot(slot, (prev) => ({ ...prev, status: "loading", error: null }));
            try {
                const image = await loadImageElement(objectUrl);
                if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
                    throw new Error("画像の寸法が不正です");
                }
                const source: TextureSource = {
                    id: `image-${slot}-${Date.now()}`,
                    kind: "image",
                    element: image,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                    ready: true,
                    dynamic: false,
                    onDispose: () => {
                        URL.revokeObjectURL(objectUrl);
                    },
                };
                const layer = createTextureLayer(slot, source, "image");
                setSlot(slot, () => ({ layer, status: "ready", error: null }));
            } catch (error) {
                URL.revokeObjectURL(objectUrl);
                const message =
                    error instanceof Error ? error.message : "画像の読み込みに失敗しました";
                setSlot(slot, () => ({ layer: null, status: "error", error: message }));
            }
        },
        [createTextureLayer, loadImageElement, setSlot],
    );

    const loadPreset = useCallback(
        async (slot: TextureSlot, presetId: string) => {
            const preset = presets.find((item) => item.id === presetId);
            if (!preset) {
                setSlot(slot, () => ({
                    layer: null,
                    status: "error",
                    error: "プリセットが見つかりません",
                }));
                return;
            }
            setSlot(slot, (prev) => ({ ...prev, status: "loading", error: null }));
            try {
                const image = await loadImageElement(preset.url);
                if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
                    throw new Error("プリセット画像の寸法が不正です");
                }
                const kind: TextureSourceKind = preset.kind ?? "image";
                const source: TextureSource = {
                    id: `preset-${preset.id}`,
                    kind,
                    element: image,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                    ready: true,
                    dynamic: false,
                };
                const transform = preset.transform ?? IDENTITY_UV_TRANSFORM;
                const layer = createTextureLayer(slot, source, kind, transform);
                setSlot(slot, () => ({ layer, status: "ready", error: null }));
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "プリセットの読み込みに失敗しました";
                setSlot(slot, () => ({ layer: null, status: "error", error: message }));
            }
        },
        [createTextureLayer, loadImageElement, presets, setSlot],
    );

    const enableCamera = useCallback(
        async (slot: TextureSlot = TEXTURE_SLOTS.camera) => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setSlot(slot, () => ({
                    layer: null,
                    status: "error",
                    error: "カメラを利用できません",
                }));
                return;
            }
            setSlot(slot, (prev) => ({ ...prev, status: "loading", error: null }));
            let stream: MediaStream | null = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                const video = document.createElement("video");
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.srcObject = stream;
                const ensureMetadata = () =>
                    new Promise<void>((resolve, reject) => {
                        const cleanup = () => {
                            video.onloadedmetadata = null;
                            video.onloadeddata = null;
                            video.oncanplay = null;
                            video.onerror = null;
                        };
                        video.onloadedmetadata = () => {
                            cleanup();
                            resolve();
                        };
                        video.onloadeddata = () => {
                            cleanup();
                            resolve();
                        };
                        video.oncanplay = () => {
                            cleanup();
                            resolve();
                        };
                        video.onerror = () => {
                            cleanup();
                            reject(new Error("カメラストリームの初期化に失敗しました"));
                        };
                    });
                await ensureMetadata();
                await video.play();
                const width =
                    video.videoWidth || (stream.getVideoTracks()[0]?.getSettings().width ?? 0);
                const height =
                    video.videoHeight || (stream.getVideoTracks()[0]?.getSettings().height ?? 0);
                if (width <= 0 || height <= 0) {
                    throw new Error("カメラ映像の寸法を取得できませんでした");
                }
                const dispose = () => {
                    stream?.getTracks().forEach((track) => {
                        track.stop();
                    });
                    video.srcObject = null;
                };
                activeStreams.current.set(slot, dispose);
                const source: TextureSource = {
                    id: `camera-${slot}`,
                    kind: "camera",
                    element: video,
                    width,
                    height,
                    ready: true,
                    dynamic: true,
                    onDispose: dispose,
                };
                const layer = createTextureLayer(slot, source, "camera");
                setSlot(slot, () => ({ layer, status: "ready", error: null }));
            } catch (error) {
                stream?.getTracks().forEach((track) => {
                    track.stop();
                });
                const message =
                    error instanceof Error ? error.message : "カメラの初期化に失敗しました";
                setSlot(slot, () => ({ layer: null, status: "error", error: message }));
            }
        },
        [createTextureLayer, setSlot],
    );

    const enableCanvas = useCallback(
        (slot: TextureSlot = TEXTURE_SLOTS.base, options: CanvasTextureOptions = {}) => {
            const width = Math.max(1, Math.floor(options.width ?? 512));
            const height = Math.max(1, Math.floor(options.height ?? 512));
            const dpr =
                options.devicePixelRatio ??
                (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            const context = canvas.getContext("2d");
            if (context) {
                context.lineCap = "round";
                context.lineJoin = "round";
            }
            const source: TextureSource = {
                id: options.id ?? `canvas-${slot}-${Date.now()}`,
                kind: "canvas",
                element: canvas,
                width: canvas.width,
                height: canvas.height,
                ready: true,
                dynamic: true,
            };
            activeCanvasSources.current.set(slot, source);
            const transform = options.transform ?? IDENTITY_UV_TRANSFORM;
            const layer = createTextureLayer(slot, source, "canvas", transform);
            setSlot(slot, () => ({ layer, status: "ready", error: null }));
            options.onCreate?.(canvas);
            const handle: CanvasTextureHandle = {
                canvas,
                context,
                resize: (nextWidth: number, nextHeight: number) => {
                    const safeWidth = Math.max(1, Math.floor(nextWidth));
                    const safeHeight = Math.max(1, Math.floor(nextHeight));
                    const ratio =
                        options.devicePixelRatio ??
                        (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
                    canvas.width = Math.round(safeWidth * ratio);
                    canvas.height = Math.round(safeHeight * ratio);
                    canvas.style.width = `${safeWidth}px`;
                    canvas.style.height = `${safeHeight}px`;
                    source.width = canvas.width;
                    source.height = canvas.height;
                    setSlot(slot, (prev) => {
                        if (!prev.layer) return prev;
                        if (prev.layer.source === source) {
                            return prev;
                        }
                        return {
                            ...prev,
                            layer: {
                                ...prev.layer,
                                source,
                            },
                        };
                    });
                },
            };
            return handle;
        },
        [createTextureLayer, setSlot],
    );

    const disable = useCallback(
        (slot: TextureSlot) => {
            setSlot(slot, () => ({ ...DEFAULT_SLOT_STATE }));
        },
        [setSlot],
    );

    const setTransform = useCallback(
        (slot: TextureSlot, transform: TextureUVTransform) => {
            setSlot(slot, (prev) => {
                if (!prev.layer) return prev;
                return {
                    ...prev,
                    layer: {
                        ...prev.layer,
                        transform,
                    },
                };
            });
        },
        [setSlot],
    );

    useEffect(() => {
        slotsRef.current = slots;
    }, [slots]);

    useEffect(() => {
        return () => {
            for (const slot of ALL_SLOTS) {
                const entry = slotsRef.current[slot];
                if (entry?.layer) {
                    disposeLayer(slot, entry.layer);
                }
            }
        };
    }, [disposeLayer]);

    const textures = useMemo(() => {
        return ALL_SLOTS.map((slot) => slots[slot]?.layer).filter((layer): layer is TextureLayer =>
            Boolean(layer?.enabled),
        );
    }, [slots]);

    const sceneTextures = useMemo(() => {
        return textures.map(
            (layer) =>
                ({
                    slot: layer.slot,
                    kind: layer.kind,
                    enabled: layer.enabled,
                    transform: layer.transform,
                    opacity: layer.opacity,
                }) satisfies SceneTextureLayer,
        );
    }, [textures]);

    return {
        textures,
        sceneTextures,
        slots,
        loadFile,
        loadPreset,
        enableCamera,
        enableCanvas,
        disable,
        setTransform,
        presets,
    };
}
