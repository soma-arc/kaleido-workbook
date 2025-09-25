import { describe, expect, it } from "vitest";
import type { HalfPlane } from "@/geom/primitives/halfPlane";
import type { Viewport } from "@/render/viewport";
import { hitTestHalfPlane, nextOffsetOnDrag } from "@/ui/interactions/euclideanHalfPlaneDrag";

const vp: Viewport = { scale: 100, tx: 0, ty: 0 };

describe("euclideanHalfPlaneDrag", () => {
    it("hitTestHalfPlane detects near pixels", () => {
        const plane: HalfPlane = { normal: { x: 1, y: 0 }, offset: 0 }; // x=0 line
        // 2px away in +x
        const screen = { x: 2, y: 0 };
        expect(hitTestHalfPlane(plane, vp, screen, 8)).toBe(true);
        // 20px away
        expect(hitTestHalfPlane(plane, vp, { x: 20, y: 0 }, 8)).toBe(false);
    });

    it("nextOffsetOnDrag updates offset by normal·Δworld", () => {
        const normal = { x: 1, y: 0 };
        const d0 = 0;
        const start = { x: 0, y: 0 };
        const cur = { x: 10, y: 0 }; // 10px to the right => 0.1 world units
        const d1 = nextOffsetOnDrag(normal, d0, vp, start, cur);
        expect(d1).toBeCloseTo(-0.1, 12);
    });
});
