import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { detectRenderMode } from "@/render/engine";
import { useTriangleParams } from "@/ui/hooks/useTriangleParams";
import {
    getSceneDefinition,
    SCENE_IDS,
    SCENE_ORDER,
    type SceneDefinition,
    type SceneId,
} from "@/ui/scenes";
import { EuclideanSceneHost } from "@/ui/scenes/EuclideanSceneHost";
import { SphericalSceneHost } from "@/ui/scenes/SphericalSceneHost";
import { useSceneRegistry } from "@/ui/scenes/useSceneRegistry";

const TRIANGLE_N_MAX = 100;
const INITIAL_PARAMS = { p: 2, q: 3, r: 7, depth: 2 } as const;
const DEPTH_RANGE = { min: 0, max: 10 } as const;

type EmbeddedSceneProps = {
    sceneId: SceneId;
};

const STORY_EMBED_WRAPPER_STYLE = {
    "--embed-frame-width": "min(100%, 960px)",
    width: "100%",
    margin: "0 auto",
} as CSSProperties;

function EmbeddedPlanarScene({
    scene,
    scenes,
}: {
    scene: SceneDefinition;
    scenes: SceneDefinition[];
}): JSX.Element {
    const [renderMode] = useState(() => detectRenderMode());
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
            activeSceneId={scene.id}
            onSceneChange={() => {
                /* no-op in embed preview */
            }}
            renderMode={renderMode}
            triangle={triangleParams}
            embed
        />
    );
}

function EmbeddedSphericalScene({
    scene,
    scenes,
}: {
    scene: SceneDefinition;
    scenes: SceneDefinition[];
}): JSX.Element {
    return (
        <SphericalSceneHost
            scene={scene}
            scenes={scenes}
            activeSceneId={scene.id}
            onSceneChange={() => {
                /* no-op in embed preview */
            }}
            embed
        />
    );
}

function EmbeddedScene({ sceneId }: EmbeddedSceneProps): JSX.Element {
    const { scenes } = useSceneRegistry();
    const scene = useMemo(() => getSceneDefinition(sceneId), [sceneId]);

    if (scene.geometry === GEOMETRY_KIND.spherical) {
        return (
            <div style={STORY_EMBED_WRAPPER_STYLE}>
                <EmbeddedSphericalScene scene={scene} scenes={scenes} />
            </div>
        );
    }

    return (
        <div style={STORY_EMBED_WRAPPER_STYLE}>
            <EmbeddedPlanarScene scene={scene} scenes={scenes} />
        </div>
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
            `<!doctype html><html><head><style>:root{--embed-frame-width:100vw;}html,body{margin:0;background:#111827;height:100%;min-height:100vh;overflow:hidden;}#root{width:100%;min-height:100vh;}</style></head><body><div id="root"></div></body></html>`,
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
                style={{ border: "none", width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}
                title={`Embedded scene ${sceneId}`}
            />
        </div>
    );
}

function formatSceneLabel(scene: SceneDefinition): string {
    return scene.label ?? scene.id;
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
            options: SCENE_ORDER,
            control: {
                type: "select",
                labels: SCENE_ORDER.reduce<Record<SceneId, string>>(
                    (acc, sceneId) => {
                        acc[sceneId] = formatSceneLabel(getSceneDefinition(sceneId));
                        return acc;
                    },
                    {} as Record<SceneId, string>,
                ),
            },
        },
    },
    args: {
        sceneId: SCENE_ORDER[0] ?? SCENE_IDS.euclideanRegularSquare,
    },
};

export default meta;

type Story = StoryObj<typeof EmbeddedSceneIframe>;

export const Default: Story = {};

const galleryStyles: CSSProperties = {
    display: "grid",
    gap: "24px",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    width: "100%",
};

export const AllScenes: Story = {
    render: () => (
        <div style={galleryStyles}>
            {SCENE_ORDER.map((sceneId) => {
                const scene = getSceneDefinition(sceneId);
                return (
                    <div
                        key={sceneId}
                        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                    >
                        <strong>{formatSceneLabel(scene)}</strong>
                        <EmbeddedScene sceneId={sceneId} />
                    </div>
                );
            })}
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: "定義済みのすべてのシーンIDを自動的に並べてプレビューします。シーンが追加されると、この一覧も自動更新されます。",
            },
        },
    },
};
