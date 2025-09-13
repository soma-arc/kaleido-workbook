import { describe, it, expect } from "vitest";
import { geodesicFromBoundary } from "../../../src/geom/geodesic";
import { reflectAcrossGeodesic } from "../../../src/geom/reflect";
import { angleToBoundaryPoint } from "../../../src/geom/unit-disk";

describe("reflectAcrossGeodesic (unit)", () => {
    it("diameter: line through origin keeps colinear points fixed and flips perpendicular", () => {
        const a = angleToBoundaryPoint(0); // (1,0)
        const b = angleToBoundaryPoint(Math.PI); // (-1,0)
        const g = geodesicFromBoundary(a, b);
        if (g.kind !== "diameter") throw new Error("expected diameter");
        const R = reflectAcrossGeodesic(g);
        // on-line point
        expect(R({ x: 0.3, y: 0 })).toEqual({ x: 0.3, y: 0 });
        // perpendicular point
        const q = R({ x: 0, y: 0.4 });
        expect(q.x).toBeCloseTo(0, 12);
        expect(q.y).toBeCloseTo(-0.4, 12);
        // involution
        const p = { x: 0.2, y: 0.1 };
        const back = R(R(p));
        expect(back.x).toBeCloseTo(p.x, 12);
        expect(back.y).toBeCloseTo(p.y, 12);
    });

    it("circle: inversion in orthogonal circle fixes the circle and is an involution", () => {
        const a = angleToBoundaryPoint(0.3);
        const b = angleToBoundaryPoint(1.2);
        const g = geodesicFromBoundary(a, b);
        if (g.kind !== "circle") throw new Error("expected circle");
        const R = reflectAcrossGeodesic(g);
        // point on the geodesic circle is fixed
        const ph = 0.5;
        const onCircle = { x: g.c.x + g.r * Math.cos(ph), y: g.c.y + g.r * Math.sin(ph) };
        const fixed = R(onCircle);
        expect(fixed.x).toBeCloseTo(onCircle.x, 12);
        expect(fixed.y).toBeCloseTo(onCircle.y, 12);
        // involution
        const p = { x: 0.1, y: -0.2 };
        const back = R(R(p));
        expect(back.x).toBeCloseTo(p.x, 12);
        expect(back.y).toBeCloseTo(p.y, 12);
    });
});

