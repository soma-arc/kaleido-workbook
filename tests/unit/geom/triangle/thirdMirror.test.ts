import { describe, expect, it } from "vitest";
import type { Vec2 } from "@/geom/core/types";
import { geodesicFromBoundary } from "@/geom/primitives/geodesic";
import { angleBetweenGeodesicsAt } from "@/geom/triangle/geodesicAngles";
import { circleFromParameter, solveThirdMirror } from "@/geom/triangle/thirdMirror";

const alpha = Math.PI / 2; // p = 2
const beta = Math.PI / 3; // q = 3
const gamma = Math.PI / 7; // r = 7

function makeBaseGeodesics() {
    const g1 = geodesicFromBoundary({ x: 1, y: 0 }, { x: -1, y: 0 });
    const dir = { x: Math.cos(alpha), y: Math.sin(alpha) } satisfies Vec2;
    const g2 = geodesicFromBoundary(dir, { x: -dir.x, y: -dir.y });
    return { g1, g2 };
}

describe("geom/triangle/thirdMirror", () => {
    it("circleFromParameter produces a circle orthogonal to the unit disk", () => {
        const { cx, cy, r } = circleFromParameter(0.5, beta);
        const normSq = cx * cx + cy * cy;
        expect(Math.abs(normSq - (1 + r * r))).toBeLessThan(1e-9);
    });

    it("solveThirdMirror returns a circle giving target angles", () => {
        const { g1, g2 } = makeBaseGeodesics();
        const circle = solveThirdMirror(alpha, beta, gamma);
        const g3 = { kind: "circle", c: circle.c, r: circle.r } as const;

        const angleAtOrigin = angleBetweenGeodesicsAt(g1, g2, { x: 0, y: 0 });
        expect(Math.abs(angleAtOrigin - alpha)).toBeLessThan(1e-9);

        const angleAtG1 = angleBetweenGeodesicsAt(g1, g3);
        const angleAtG2 = angleBetweenGeodesicsAt(g2, g3);
        expect(Math.abs(angleAtG1 - beta)).toBeLessThan(5e-3);
        expect(Math.abs(angleAtG2 - gamma)).toBeLessThan(5e-3);
    });
});
