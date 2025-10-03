import { act, createRef, type MutableRefObject, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    IDENTITY_UV_TRANSFORM,
    TEXTURE_SLOTS,
    type TextureLayer,
    type TextureSource,
} from "../../../src/render/webgl/textures";
import { CameraInput } from "../../../src/ui/components/texture/CameraInput";
import { TexturePicker } from "../../../src/ui/components/texture/TexturePicker";
import {
    type TextureSlotState,
    type UseTextureInputResult,
    useTextureInput,
} from "../../../src/ui/hooks/useTextureSource";
import type { TexturePreset } from "../../../src/ui/texture/types";

const globalActFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActFlag.IS_REACT_ACT_ENVIRONMENT = true;

describe("TexturePicker", () => {
    it("invokes file and preset handlers", () => {
        const onFile = vi.fn();
        const onPreset = vi.fn();
        const onClear = vi.fn();
        const container = document.createElement("div");
        const root = createRoot(container);
        const canvas = document.createElement("canvas");
        const source: TextureSource = {
            id: "stub-image",
            kind: "image",
            element: canvas,
            width: 2,
            height: 2,
            ready: true,
            dynamic: false,
        };
        const layer: TextureLayer = {
            slot: TEXTURE_SLOTS.base,
            kind: "image",
            enabled: true,
            opacity: 1,
            transform: IDENTITY_UV_TRANSFORM,
            source,
        };
        const state: TextureSlotState = { layer, status: "ready", error: null };
        const presets: TexturePreset[] = [{ id: "grid", label: "Grid", url: "mock" }];

        act(() => {
            root.render(
                <TexturePicker
                    slot={TEXTURE_SLOTS.base}
                    state={state}
                    presets={presets}
                    onSelectFile={onFile}
                    onSelectPreset={onPreset}
                    onClear={onClear}
                />,
            );
        });

        const fileInput = container.querySelector("input[type=file]") as HTMLInputElement;
        expect(fileInput).toBeTruthy();
        const file = new File(["stub"], "texture.png", { type: "image/png" });
        Object.defineProperty(fileInput, "files", {
            configurable: true,
            get: () =>
                ({
                    0: file,
                    length: 1,
                    item: (index: number) => (index === 0 ? file : null),
                }) as unknown as FileList,
        });
        act(() => {
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        });
        expect(onFile).toHaveBeenCalledWith(file);

        const select = container.querySelector("select") as HTMLSelectElement;
        expect(select).toBeTruthy();
        act(() => {
            select.value = "grid";
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
        expect(onPreset).toHaveBeenCalledWith("grid");

        const clearButton = container.querySelector("button") as HTMLButtonElement;
        expect(clearButton).toBeTruthy();
        act(() => {
            clearButton.click();
        });
        expect(onClear).toHaveBeenCalledTimes(1);

        act(() => {
            root.unmount();
        });
    });
});

describe("CameraInput", () => {
    it("triggers enable and disable handlers", () => {
        const onEnable = vi.fn();
        const onDisable = vi.fn();
        const container = document.createElement("div");
        const root = createRoot(container);
        const idleState: TextureSlotState = { layer: null, status: "idle", error: null };

        act(() => {
            root.render(
                <CameraInput
                    slot={TEXTURE_SLOTS.camera}
                    state={idleState}
                    onEnable={onEnable}
                    onDisable={onDisable}
                />,
            );
        });

        const button = container.querySelector("button") as HTMLButtonElement;
        expect(button).toBeTruthy();
        act(() => {
            button.click();
        });
        expect(onEnable).toHaveBeenCalledTimes(1);

        const video = document.createElement("video");
        const source: TextureSource = {
            id: "camera-test",
            kind: "camera",
            element: video,
            width: 640,
            height: 480,
            ready: true,
            dynamic: true,
        };
        const readyLayer: TextureLayer = {
            slot: TEXTURE_SLOTS.camera,
            kind: "camera",
            enabled: true,
            opacity: 1,
            transform: IDENTITY_UV_TRANSFORM,
            source,
        };
        const readyState: TextureSlotState = { layer: readyLayer, status: "ready", error: null };

        act(() => {
            root.render(
                <CameraInput
                    slot={TEXTURE_SLOTS.camera}
                    state={readyState}
                    onEnable={onEnable}
                    onDisable={onDisable}
                />,
            );
        });

        const activeButton = container.querySelector("button") as HTMLButtonElement;
        act(() => {
            activeButton.click();
        });
        expect(onDisable).toHaveBeenCalledTimes(1);

        act(() => {
            root.unmount();
        });
    });
});

describe("useTextureInput", () => {
    let originalImage: typeof Image;

    beforeEach(() => {
        originalImage = global.Image;
        class MockImage {
            public onload: (() => void) | null = null;
            public onerror: (() => void) | null = null;
            public naturalWidth = 256;
            public naturalHeight = 256;
            public decoding = "async";
            set src(value: string) {
                if (value.includes("fail")) {
                    this.onerror?.();
                } else {
                    setTimeout(() => {
                        this.onload?.();
                    }, 0);
                }
            }
        }
        (global as { Image: typeof Image }).Image = MockImage as unknown as typeof Image;
    });

    afterEach(() => {
        (global as { Image: typeof Image }).Image = originalImage;
        vi.restoreAllMocks();
    });

    type HookValue = UseTextureInputResult;

    function HookHarness({
        presets,
        hookRef,
    }: {
        presets: TexturePreset[];
        hookRef: MutableRefObject<HookValue | null>;
    }): JSX.Element | null {
        const value = useTextureInput({ presets });
        useEffect(() => {
            hookRef.current = value;
        }, [value, hookRef]);
        return null;
    }

    it("loads preset images into texture slots", async () => {
        const container = document.createElement("div");
        const root = createRoot(container);
        const hookRef = createRef<HookValue | null>();
        const presets: TexturePreset[] = [{ id: "grid", label: "Grid", url: "mock-url" }];

        act(() => {
            root.render(<HookHarness presets={presets} hookRef={hookRef} />);
        });

        expect(hookRef.current).not.toBeNull();
        await act(async () => {
            await hookRef.current?.loadPreset(TEXTURE_SLOTS.base, "grid");
        });

        const baseState = hookRef.current?.slots[TEXTURE_SLOTS.base];
        expect(baseState?.status).toBe("ready");
        expect(hookRef.current?.textures).toHaveLength(1);

        act(() => {
            hookRef.current?.disable(TEXTURE_SLOTS.base);
        });
        expect(hookRef.current?.slots[TEXTURE_SLOTS.base].status).toBe("idle");
        expect(hookRef.current?.textures).toHaveLength(0);

        act(() => {
            root.unmount();
        });
    });
});
