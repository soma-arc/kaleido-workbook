/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    adjacent,
    InvalidationScheduler,
    intersects,
    type Rect,
    union,
} from "../../../src/render/invalidation";

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

describe("render/invalidation", () => {
    it("intersects and adjacent detection", () => {
        expect(intersects(r(0, 0, 10, 10), r(5, 5, 10, 10))).toBe(true);
        expect(intersects(r(0, 0, 10, 10), r(11, 0, 5, 5))).toBe(false);
        expect(adjacent(r(0, 0, 10, 10), r(10, 2, 5, 4))).toBe(true);
        expect(adjacent(r(0, 0, 10, 10), r(0, 10, 4, 5))).toBe(true);
    });

    it("union merges to bounding rect", () => {
        const u = union(r(0, 0, 10, 10), r(8, -2, 10, 4));
        expect(u).toEqual({ x: 0, y: -2, w: 18, h: 12 });
    });

    it("coalesces multiple invalidates into one RAF frame", async () => {
        vi.useFakeTimers();
        const calls: Rect[][] = [];
        const sched = new InvalidationScheduler((rects) => calls.push(rects));
        sched.invalidate({ x: 0, y: 0, w: 10, h: 10 });
        sched.invalidate({ x: 8, y: 0, w: 10, h: 10 }); // overlaps -> merge
        // advance a frame
        // requestAnimationFrame fallback uses setTimeout(16)
        vi.advanceTimersByTime(20);
        expect(calls.length).toBe(1);
        expect(calls[0].length).toBe(1);
        expect(calls[0][0]).toEqual({ x: 0, y: 0, w: 18, h: 10 });
        vi.useRealTimers();
    });
});
