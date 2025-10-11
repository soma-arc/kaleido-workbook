import { describe, expect, it } from "vitest";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";

describe("Circle Inversion scene definition", () => {
    it("is registered with the expected variant and geometry", () => {
        const inversionId = SCENE_IDS.euclideanCircleInversion;
        expect(inversionId).toBeDefined();
        const scene = SCENES_BY_ID[inversionId];
        expect(scene).toBeDefined();
        expect(scene.geometry).toBe("euclidean");
        expect(scene.variant).toBe("circle-inversion");
        expect(scene.supportsHandles).toBe(false);
    });

    it("provides an inversion configuration with fixed circle and rectangle", () => {
        const inversionId = SCENE_IDS.euclideanCircleInversion;
        const scene = SCENES_BY_ID[inversionId];
        expect(scene).toBeDefined();
        if (!scene?.inversionConfig) {
            throw new Error("Circle inversion scene configuration is missing");
        }
        const config = scene.inversionConfig;
        expect(config.fixedCircle.radius).toBeGreaterThan(0);
        expect(config.rectangle.halfExtents.x).toBeGreaterThan(0);
        expect(config.rectangle.halfExtents.y).toBeGreaterThan(0);
    });
});
