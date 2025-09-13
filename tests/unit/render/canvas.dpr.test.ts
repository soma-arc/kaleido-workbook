import { describe, expect, it, vi } from "vitest";

import { attachResize, setCanvasDPR } from "../../../src/render/canvas";

function makeCanvas(cssW: number, cssH: number): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    // mock layout size
    // @ts-expect-error jsdom allows overriding this method
    cv.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: cssW,
        bottom: cssH,
        width: cssW,
        height: cssH,
        toJSON() {
            return {};
        },
    });
    return cv;
}

describe("render/canvas DPR utilities", () => {
    it("sets internal resolution based on DPR (param) and css size", () => {
        const cv = makeCanvas(800, 600);
        const dpr = setCanvasDPR(cv, 2);
        expect(dpr).toBe(2);
        expect(cv.width).toBe(1600);
        expect(cv.height).toBe(1200);
    });

    it("uses devicePixelRatio when param omitted", () => {
        const old = globalThis.devicePixelRatio as unknown as number | undefined;
        // @ts-expect-error allow write
        globalThis.devicePixelRatio = 1.5;
        const cv = makeCanvas(400, 300);
        const dpr = setCanvasDPR(cv);
        expect(dpr).toBeCloseTo(1.5, 12);
        expect(cv.width).toBe(600);
        expect(cv.height).toBe(450);
        // restore
        // @ts-expect-error allow write
        globalThis.devicePixelRatio = old ?? 1;
    });

    it("attachResize wires and unwires window resize", () => {
        const cv = makeCanvas(200, 100);
        const spy = vi.fn();
        const detach = attachResize(cv, spy);
        window.dispatchEvent(new Event("resize"));
        expect(spy).toHaveBeenCalledTimes(1);
        detach();
        window.dispatchEvent(new Event("resize"));
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
/* @vitest-environment jsdom */
