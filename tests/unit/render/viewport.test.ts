/* @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import {
    identity,
    invert,
    screenToWorld,
    type Viewport,
    worldToScreen,
} from "../../../src/render/viewport";

const close = (a: number, b: number, d = 1e-12) => Math.abs(a - b) <= d;

describe("render/viewport", () => {
    it("round-trips world -> screen -> world", () => {
        const vp: Viewport = { scale: 2.5, tx: 100, ty: -40 };
        const p = { x: -3.2, y: 7.75 };
        const s = worldToScreen(vp, p);
        const q = screenToWorld(vp, s);
        expect(close(q.x, p.x)).toBe(true);
        expect(close(q.y, p.y)).toBe(true);
    });

    it("identity reflects points across the x-axis", () => {
        // キャンバスの正方向は上向きなので、y座標が反転する
        const p = { x: 12.34, y: -56.78 };
        const s = worldToScreen(identity, p);
        expect(close(s.x, p.x)).toBe(true);
        expect(close(s.y, -p.y)).toBe(true);
        const w = screenToWorld(identity, s);
        expect(close(w.x, p.x)).toBe(true);
        expect(close(w.y, p.y)).toBe(true);
    });

    it("invert produces a transform that undoes the original", () => {
        const vp: Viewport = { scale: 1.75, tx: -20, ty: 80 };
        const inv = invert(vp);
        const p = { x: 4, y: -9 };
        const s = worldToScreen(vp, p);
        const back = worldToScreen(inv, s); // treat inv as world->screen acting on screen-space
        expect(close(back.x, p.x)).toBe(true);
        expect(close(back.y, p.y)).toBe(true);
    });
});
