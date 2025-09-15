/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { exportPNG } from "../../../src/render/export";

function makeCanvas(w = 100, h = 50) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    // stub toDataURL without using any
    const stub: HTMLCanvasElement["toDataURL"] = () => "data:image/png;base64,AAAA";
    (cv as HTMLCanvasElement).toDataURL = stub;
    return cv as HTMLCanvasElement;
}

describe("render/exportPNG", () => {
    it("returns PNG dataURL (direct path)", () => {
        const cv = makeCanvas();
        const d = exportPNG(cv);
        expect(d.startsWith("data:image/png")).toBe(true);
    });

    it("scales via intermediate canvas when scale!=1", () => {
        const cv = makeCanvas(120, 80);
        // spy on created canvas
        const created: HTMLCanvasElement[] = [];
        const orig = document.createElement.bind(document);
        vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
            const el = orig(tag);
            if (tag === "canvas") {
                const canvas = el as HTMLCanvasElement;
                const stub: HTMLCanvasElement["toDataURL"] = () => "data:image/png;base64,BBBB";
                canvas.toDataURL = stub;
                created.push(canvas);
                return canvas;
            }
            return el;
        });
        const d = exportPNG(cv, { scale: 2 });
        expect(d.startsWith("data:image/png")).toBe(true);
        expect(created[0]?.width).toBe(240);
        expect(created[0]?.height).toBe(160);
    });
});
