import { describe, expect, it } from "vitest";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";

describe("hinge scene definition", () => {
    it("configures plane 1 free handle via initial control points", () => {
        const hingeScene = SCENES_BY_ID[SCENE_IDS.euclideanHinge];
        expect(hingeScene.initialControlPoints).toBeTruthy();
        const controls = hingeScene.initialControlPoints ?? [];
        expect(controls).toHaveLength(2);

        const plane0 = controls[0];
        const plane1 = controls[1];

        expect(plane0[0]).toMatchObject({ id: "hinge", fixed: true });
        expect(plane1[1]).toMatchObject({ id: "hinge", fixed: true });
        expect(plane1[0].fixed).toBe(false);
        expect(plane1[0].x).toBeCloseTo(-0.8, -12);
        expect(plane1[0].y).toBeCloseTo(0, -12);
    });
});
