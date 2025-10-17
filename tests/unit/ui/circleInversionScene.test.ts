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
        expect(scene.supportsHandles).toBe(true);
        expect(scene.controlAssignments).toBeDefined();
        expect(scene.controlAssignments).toHaveLength(2);
        expect(scene.initialControlPoints).toBeDefined();
        expect(scene.initialControlPoints).toHaveLength(1);
        const [points] = scene.initialControlPoints ?? [];
        expect(points?.[0]?.id).toBeTruthy();
        expect(points?.[1]?.id).toBeTruthy();
        expect(points?.[0]?.id).not.toBe(points?.[1]?.id);
    });

    it("provides an inversion configuration with fixed circle, line, and rectangle", () => {
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
        expect(config.line.start.x).not.toBe(config.line.end.x);
        expect(config.display.showReferenceLine).toBe(true);
        expect(config.display.showInvertedRectangle).toBe(true);
        expect(config.display.textureEnabled).toBe(true);
    });
});
