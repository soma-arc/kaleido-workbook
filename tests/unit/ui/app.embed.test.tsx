import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/ui/App";
import { SCENE_IDS } from "@/ui/scenes";
import type { TriangleSceneHostProps } from "@/ui/scenes/TriangleSceneHost";

const hostSpy = vi.fn<(props: TriangleSceneHostProps) => void>();

let root: Root | null = null;
let container: HTMLDivElement | null = null;

vi.mock("@/ui/scenes/TriangleSceneHost", async () => {
    const actual = await vi.importActual<typeof import("@/ui/scenes/TriangleSceneHost")>(
        "@/ui/scenes/TriangleSceneHost",
    );
    return {
        ...actual,
        TriangleSceneHost: (props: TriangleSceneHostProps) => {
            hostSpy(props);
            return <div data-testid="triangle-scene-host" />;
        },
    };
});

function setSearchParams(params: Record<string, string | undefined>) {
    const url = new URL(window.location.href);
    url.search = "";
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            search.set(key, value);
        }
    }
    url.search = search.toString();
    window.history.replaceState(null, "", url.toString());
}

function renderApp() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
        root?.render(<App />);
    });
}

describe("App query parameters", () => {
    beforeEach(() => {
        hostSpy.mockClear();
        setSearchParams({});
        document.body.classList.remove("embed-mode");
    });

    afterEach(() => {
        if (root) {
            act(() => {
                root?.unmount();
            });
            root = null;
        }
        if (container) {
            if (container.parentElement) {
                container.parentElement.removeChild(container);
            }
            container = null;
        }
        setSearchParams({});
        document.body.classList.remove("embed-mode");
    });

    it("selects scene and embed mode from query", () => {
        setSearchParams({ scene: SCENE_IDS.regularSquare, embed: "1" });
        renderApp();
        const lastCall = hostSpy.mock.calls.at(-1);
        expect(lastCall).toBeTruthy();
        const props = lastCall?.[0];
        expect(props).toBeTruthy();
        if (!props) return;
        expect(props.activeSceneId).toBe(SCENE_IDS.regularSquare);
        expect(props.embed).toBe(true);
        expect(document.body.classList.contains("embed-mode")).toBe(true);
    });

    it("falls back to default scene when query is invalid", () => {
        setSearchParams({ scene: "invalid" });
        renderApp();
        const lastCall = hostSpy.mock.calls.at(-1);
        expect(lastCall).toBeTruthy();
        const props = lastCall?.[0];
        expect(props).toBeTruthy();
        if (!props) return;
        expect(Object.values(SCENE_IDS)).toContain(props.activeSceneId);
        expect(props.embed).toBe(false);
    });

    it("updates URL when scene changes", () => {
        setSearchParams({ embed: "1" });
        renderApp();
        const initial = hostSpy.mock.calls.at(-1)?.[0];
        expect(initial).toBeTruthy();
        if (!initial) return;
        act(() => {
            initial.onSceneChange(SCENE_IDS.hinge);
        });
        const next = hostSpy.mock.calls.at(-1)?.[0];
        expect(next).toBeTruthy();
        if (!next) return;
        expect(next.activeSceneId).toBe(SCENE_IDS.hinge);
        const params = new URLSearchParams(window.location.search);
        expect(params.get("scene")).toBe(SCENE_IDS.hinge);
        expect(params.get("embed")).toBe("1");
    });
});
