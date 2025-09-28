import type { SceneDefinition, SceneId } from "../scenes";

export type SceneEmbedQuery = {
    sceneId: SceneId;
    embed: boolean;
};

const EMBED_CLASS = "embed-mode";

function hasWindow(): boolean {
    return typeof window !== "undefined" && typeof window.location !== "undefined";
}

export function parseSceneEmbedQuery(
    scenes: SceneDefinition[],
    fallbackSceneId: SceneId,
): SceneEmbedQuery {
    if (!hasWindow()) {
        return { sceneId: fallbackSceneId, embed: false };
    }
    const params = new URLSearchParams(window.location.search);
    const requestedScene = params.get("scene") ?? "";
    const available = new Set(scenes.map((scene) => scene.id));
    const normalizedScene = available.has(requestedScene as SceneId)
        ? (requestedScene as SceneId)
        : fallbackSceneId;
    const embedFlag = params.get("embed");
    const embed = embedFlag === "1" || embedFlag?.toLowerCase() === "true";
    return { sceneId: normalizedScene, embed };
}

export function syncSceneEmbedQuery(
    sceneId: SceneId,
    embed: boolean,
    fallbackSceneId: SceneId,
): void {
    if (!hasWindow()) return;
    const params = new URLSearchParams(window.location.search);
    if (sceneId === fallbackSceneId) {
        params.delete("scene");
    } else {
        params.set("scene", sceneId);
    }
    if (embed) {
        params.set("embed", "1");
    } else {
        params.delete("embed");
    }
    const next = params.toString();
    const hash = window.location.hash;
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ""}${hash}`;
    window.history.replaceState(null, "", nextUrl);
}

export function applyEmbedClass(embed: boolean): void {
    if (typeof document === "undefined") return;
    const targets = [document.documentElement, document.body].filter(Boolean);
    for (const target of targets) {
        if (embed) {
            target.classList.add(EMBED_CLASS);
        } else {
            target.classList.remove(EMBED_CLASS);
        }
    }
    if (embed) {
        document.documentElement.style.backgroundColor = "#0b0b0b";
        document.body.style.margin = "0";
    } else {
        document.documentElement.style.backgroundColor = "";
        document.body.style.margin = "";
    }
}
