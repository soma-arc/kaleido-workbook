import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useMemo } from "react";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { CameraInput } from "@/ui/components/texture/CameraInput";
import { TextureDrawCanvas } from "@/ui/components/texture/TextureDrawCanvas";
import { TexturePicker } from "@/ui/components/texture/TexturePicker";
import { useTextureInput } from "@/ui/hooks/useTextureSource";
import { DEFAULT_TEXTURE_PRESETS } from "@/ui/texture/presets";

function TextureInputDemo(): JSX.Element {
    const presets = useMemo(() => DEFAULT_TEXTURE_PRESETS, []);
    const textureInput = useTextureInput({ presets });

    return (
        <div style={{ display: "grid", gap: "20px", maxWidth: "600px" }}>
            <TexturePicker
                slot={TEXTURE_SLOTS.base}
                state={textureInput.slots[TEXTURE_SLOTS.base]}
                presets={presets}
                onSelectFile={(file) => textureInput.loadFile(TEXTURE_SLOTS.base, file)}
                onSelectPreset={(id) => textureInput.loadPreset(TEXTURE_SLOTS.base, id)}
                onClear={() => textureInput.disable(TEXTURE_SLOTS.base)}
            />
            <TextureDrawCanvas
                textureInput={textureInput}
                slot={TEXTURE_SLOTS.base}
                width={320}
                height={240}
                devicePixelRatio={1}
            />
            <CameraInput
                slot={TEXTURE_SLOTS.camera}
                state={textureInput.slots[TEXTURE_SLOTS.camera]}
                onEnable={() => textureInput.enableCamera(TEXTURE_SLOTS.camera)}
                onDisable={() => textureInput.disable(TEXTURE_SLOTS.camera)}
            />
            <pre
                data-testid="texture-state"
                style={{
                    margin: 0,
                    padding: "8px",
                    borderRadius: "6px",
                    background: "#f6f8fa",
                    fontSize: "0.75rem",
                    overflowX: "auto",
                }}
            >
                {JSON.stringify(textureInput.sceneTextures, null, 2)}
            </pre>
        </div>
    );
}

const meta: Meta<typeof TextureInputDemo> = {
    title: "Controls/Texture Input",
    component: TextureInputDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "centered",
        controls: {
            hideNoControlsWarning: true,
        },
        docs: {
            description: {
                component:
                    "テクスチャ入力のUIコンポーネントをまとめて検証するデモです。ファイル選択やプリセット、カメラ許可のフローを Storybook 上で確認できます。",
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof TextureInputDemo>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const presetSelect = await canvas.findByRole("combobox");
        await userEvent.selectOptions(presetSelect, "grid");
        await waitFor(async () => {
            const status = await canvas.findByText(/使用中/);
            expect(status).toBeTruthy();
        });
        const stateReadout = await canvas.findByTestId("texture-state");
        await waitFor(() => {
            expect(stateReadout.textContent).toContain('"slot": 0');
        });

        const drawCanvas = await canvas.findByTestId("texture-draw-canvas");
        await userEvent.pointer([
            { target: drawCanvas, coords: { clientX: 20, clientY: 20 }, keys: "[MouseLeft>]" },
            { coords: { clientX: 80, clientY: 90 } },
            { keys: "[/MouseLeft]" },
        ]);
        const drawState = await canvas.findByTestId("draw-canvas-state");
        await waitFor(() => {
            expect(drawState.textContent).toContain('"mode": "draw"');
        });

        const toggleButton = await canvas.findByRole("button", { name: "描画モード切り替え" });
        await userEvent.click(toggleButton);
        await waitFor(() => {
            expect(drawState.textContent).toContain('"mode": "erase"');
        });

        const clearButton = await canvas.findByRole("button", { name: "キャンバスをクリア" });
        await userEvent.click(clearButton);
    },
};
