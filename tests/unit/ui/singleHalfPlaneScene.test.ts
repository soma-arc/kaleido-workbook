import { describe, expect, it } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";

describe("single half-plane scene", () => {
    it("defines a euclidean scene with one normalized half-plane", () => {
        const scene = SCENES_BY_ID[SCENE_IDS.euclideanSingleHalfPlane];
        expect(scene.geometry).toBe(GEOMETRY_KIND.euclidean);
        expect(scene.initialHalfPlanes).toBeTruthy();
        const halfPlanes = scene.initialHalfPlanes ?? [];
        expect(halfPlanes).toHaveLength(1);
        const [plane] = halfPlanes;
        const length = Math.hypot(plane.normal.x, plane.normal.y);
        expect(length).toBeCloseTo(1, 12);
        expect(plane.offset).toBeCloseTo(0, 12);
        expect(scene.supportsHandles).toBe(true);
        expect(scene.editable).toBe(true);
    });
});
