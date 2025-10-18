import { describe, expect, it } from "vitest";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import {
    cloneCircleInversionState,
    updateCircleInversionDisplay,
    updateCircleInversionLineFromControls,
    updateCircleInversionRectangleCenter,
} from "@/ui/scenes/circleInversionConfig";

const BASE_STATE = {
    fixedCircle: { center: { x: 0, y: 0 }, radius: 0.6 },
    line: {
        start: { x: -0.6, y: 0 },
        end: { x: 0.6, y: 0.2 },
    },
    rectangle: {
        center: { x: 0.3, y: 0 },
        halfExtents: { x: 0.15, y: 0.1 },
        rotation: 0,
    },
    secondaryRectangle: {
        center: { x: -0.25, y: 0.15 },
        halfExtents: { x: 0.12, y: 0.08 },
        rotation: 0.35,
    },
    display: {
        showReferenceLine: true,
        showInvertedLine: true,
        showReferenceRectangle: true,
        showInvertedRectangle: true,
        textureEnabled: true,
        showSecondaryRectangle: true,
        showSecondaryInvertedRectangle: true,
    },
    textureAspect: null,
} as const;

describe("circle inversion config helpers", () => {
    it("clones the inversion state deeply", () => {
        const clone = cloneCircleInversionState(BASE_STATE);
        expect(clone).not.toBe(BASE_STATE);
        expect(clone.fixedCircle).not.toBe(BASE_STATE.fixedCircle);
        expect(clone.rectangle).not.toBe(BASE_STATE.rectangle);
        expect(clone.line).not.toBe(BASE_STATE.line);
        expect(clone.display).not.toBe(BASE_STATE.display);
        expect(clone.display.showReferenceLine).toBe(true);
    });

    it("updates line coordinates from control points", () => {
        const controls: HalfPlaneControlPoints = [
            { id: "circle-line-start", x: -0.2, y: -0.1, fixed: false },
            { id: "circle-line-end", x: 0.8, y: 0.4, fixed: false },
        ];
        const next = updateCircleInversionLineFromControls(BASE_STATE, controls);
        expect(next.line.start.x).toBeCloseTo(-0.2, 12);
        expect(next.line.start.y).toBeCloseTo(-0.1, 12);
        expect(next.line.end.x).toBeCloseTo(0.8, 12);
        expect(next.line.end.y).toBeCloseTo(0.4, 12);
        expect(next).not.toBe(BASE_STATE);
    });

    it("returns the same state when control points do not change", () => {
        const state = cloneCircleInversionState(BASE_STATE);
        const controls: HalfPlaneControlPoints = [
            { id: "circle-line-start", x: state.line.start.x, y: state.line.start.y, fixed: false },
            { id: "circle-line-end", x: state.line.end.x, y: state.line.end.y, fixed: false },
        ];
        const next = updateCircleInversionLineFromControls(state, controls);
        expect(next).toBe(state);
    });

    it("applies display toggles immutably", () => {
        const next = updateCircleInversionDisplay(BASE_STATE, {
            showInvertedRectangle: false,
            textureEnabled: false,
        });
        expect(next.display.showInvertedRectangle).toBe(false);
        expect(next.display.textureEnabled).toBe(false);
        expect(next.display.showReferenceLine).toBe(true);
        expect(next.display.showSecondaryRectangle).toBe(true);
        expect(BASE_STATE.display.textureEnabled).toBe(true);
    });

    it("ignores display updates when values are unchanged", () => {
        const state = cloneCircleInversionState(BASE_STATE);
        const next = updateCircleInversionDisplay(state, {
            showReferenceLine: state.display.showReferenceLine,
        });
        expect(next).toBe(state);
    });

    it("updates rectangle centers via rectangle updater", () => {
        const state = cloneCircleInversionState(BASE_STATE);
        const nextPrimary = updateCircleInversionRectangleCenter(state, "primary", {
            x: 0.5,
            y: -0.25,
        });
        expect(nextPrimary.rectangle.center).toEqual({ x: 0.5, y: -0.25 });
        expect(nextPrimary.secondaryRectangle.center).toEqual(state.secondaryRectangle.center);

        const nextSecondary = updateCircleInversionRectangleCenter(nextPrimary, "secondary", {
            x: -0.1,
            y: 0.3,
        });
        expect(nextSecondary.secondaryRectangle.center).toEqual({ x: -0.1, y: 0.3 });
    });
});
