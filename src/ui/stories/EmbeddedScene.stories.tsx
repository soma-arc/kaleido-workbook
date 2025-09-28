import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { detectRenderMode } from "@/render/engine";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import { getSceneDefinition, SCENE_IDS, type SceneId } from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

type EmbeddedSceneProps = {
    sceneId: SceneId;
};

function EmbeddedScene({ sceneId }: EmbeddedSceneProps): JSX.Element {
    const { scenes } = useSceneRegistry();
    const [renderMode] = useState(() => detectRenderMode());
    const scene = useMemo(() => getSceneDefinition(sceneId), [sceneId]);
    const triangleParams = useTriangleParams({
        initialParams: INITIAL_PARAMS,
        triangleNMax: TRIANGLE_N_MAX,
        depthRange: DEPTH_RANGE,
        initialGeometryMode: scene.geometry,
    });

    return (
        <EuclideanSceneHost
            scene={scene}
            scenes={scenes}
            activeSceneId={sceneId}
            onSceneChange={() => {
                /* no-op in embed preview */
            }}
            renderMode={renderMode}
            triangle={triangleParams}
            embed
        />
    );
}

function EmbeddedSceneIframe({ sceneId }: EmbeddedSceneProps): JSX.Element {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.open();
        doc.write(
            `<!doctype html><html><head><style>html,body{margin:0;background:#0b0b0b;height:100%;}</style></head><body><div id="root" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div></body></html>`,
        );
        doc.close();
        const mountNode = doc.getElementById("root");
        if (!mountNode) return;
        const root = createRoot(mountNode);
        root.render(<EmbeddedScene sceneId={sceneId} />);
        return () => {
            root.unmount();
        };
    }, [sceneId]);

    return (
        <div style={{ width: "100%", maxWidth: "960px", margin: "0 auto" }}>
            <iframe
                ref={iframeRef}
                style={{ border: "none", width: "100%", aspectRatio: "16 / 9" }}
                title={`Embedded scene ${sceneId}`}
            />
        </div>
    );
}

const meta: Meta<typeof EmbeddedSceneIframe> = {
    title: "Scenes/Embedded Preview",
    component: EmbeddedSceneIframe,
    parameters: {
        layout: "fullscreen",
        controls: {
            include: ["sceneId"],
        },
        docs: {
            description: {
                component:
                    "クエリパラメータによる埋め込みモードを Storybook 上で再現します。iframe 内で 16:9 の表示を確認できます。",
            },
        },
    },
    argTypes: {
        sceneId: {
            options: Object.values(SCENE_IDS),
            control: { type: "select" },
        },
    },
    args: {
        sceneId: SCENE_IDS.euclideanRegularSquare,
    },
};

export default meta;

type Story = StoryObj<typeof EmbeddedSceneIframe>;

export const Default: Story = {};
