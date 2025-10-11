import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useEffect, useId, useMemo, useRef } from "react";
import { GEOMETRY_KIND } from "@/geom/core/types";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import { createRenderEngine, type RenderEngine } from "@/render/engine";
import { TEXTURE_SLOTS } from "@/render/webgl/textures";
import { StageCanvas } from "@/ui/components/StageCanvas";
import { TextureDrawCanvas } from "@/ui/components/texture/TextureDrawCanvas";
import { useTextureInput } from "@/ui/hooks/useTextureSource";

const DEFAULT_PLANES: HalfPlane[] = [];

function HandDrawnTexturePreviewDemo(): JSX.Element {
    const textureInput = useTextureInput();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<RenderEngine | null>(null);
    const requestRef = useRef<number | null>(null);
    const stageCanvasId = useId();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = createRenderEngine(canvas, { mode: "hybrid" });
        engineRef.current = engine;
        return () => {
            if (requestRef.current !== null) {
                window.cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
            engineRef.current = null;
            engine.dispose();
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const engine = engineRef.current;
        if (!canvas || !engine) return;
        let frameId: number;
        const renderFrame = () => {
            engine.render({
                geometry: GEOMETRY_KIND.euclidean,
                halfPlanes: DEFAULT_PLANES,
                textures: textureInput.textures,
            });
            frameId = window.requestAnimationFrame(renderFrame);
            requestRef.current = frameId;
        };
        frameId = window.requestAnimationFrame(renderFrame);
        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [textureInput.textures]);

    const description = useMemo(
        () => JSON.stringify(textureInput.sceneTextures, null, 2),
        [textureInput.sceneTextures],
    );

    return (
        <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "minmax(0, 1fr)" }}>
            <TextureDrawCanvas
                textureInput={textureInput}
                slot={TEXTURE_SLOTS.base}
                width={300}
                height={220}
                devicePixelRatio={1}
            />
            <div style={{ display: "grid", gap: "12px" }}>
                <StageCanvas
                    id={stageCanvasId}
                    ref={canvasRef}
                    width={300}
                    height={220}
                    style={{ width: "300px", height: "220px", border: "1px solid #cbd5e1" }}
                />
                <pre
                    data-testid="preview-texture-state"
                    style={{
                        margin: 0,
                        padding: "8px",
                        borderRadius: "6px",
                        background: "#f8fafc",
                        fontSize: "0.7rem",
                        overflowX: "auto",
                    }}
                >
                    {description}
                </pre>
            </div>
        </div>
    );
}

const meta: Meta<typeof HandDrawnTexturePreviewDemo> = {
    title: "Controls/Hand-Drawn Texture Preview",
    component: HandDrawnTexturePreviewDemo,
    tags: ["autodocs"],
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component:
                    "手書きキャンバスで描いた内容が WebGL プレビューにも反映されるかを確認するストーリーです。",
            },
        },
    },
};

export default meta;

type Story = StoryObj<typeof HandDrawnTexturePreviewDemo>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const drawTarget = await canvas.findByTestId("texture-draw-canvas");
        await userEvent.pointer([
            { target: drawTarget, coords: { clientX: 30, clientY: 30 }, keys: "[MouseLeft>]" },
            { coords: { clientX: 120, clientY: 100 } },
            { keys: "[/MouseLeft]" },
        ]);
        const previewState = await canvas.findByTestId("preview-texture-state");
        await waitFor(() => {
            expect(previewState.textContent).toContain('"slot": 0');
        });
    },
};
