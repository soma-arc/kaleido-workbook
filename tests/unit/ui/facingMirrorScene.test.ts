import { describe, expect, it } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";

describe("Facing Mirror scene definition", () => {
    it("registers the facing mirror Euclidean scene with fixed mirrors", () => {
        const sceneId = SCENE_IDS.facingMirrorRoom;
        const scene = SCENES_BY_ID[sceneId];
        expect(scene.geometry).toBe(GEOMETRY_KIND.euclidean);
        expect(scene.supportsHandles).toBe(false);
        expect(scene.editable).toBe(false);
        expect(scene.allowPlaneDrag).toBe(false);
        expect(scene.initialHalfPlanes).toHaveLength(2);
        expect(scene.facingMirrorConfig).toBeDefined();
        expect(scene.facingMirrorConfig?.rectangleHalfExtents.x).toBeGreaterThan(0);
        expect(scene.facingMirrorConfig?.rectangleHalfExtents.y).toBeGreaterThan(0);
    });
});
