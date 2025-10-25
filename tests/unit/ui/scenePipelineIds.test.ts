import { describe, expect, it } from "vitest";
import "@/render/webglRenderer";
import {
    getRegisteredDefaultPipelineId,
    getRegisteredGeometryPipelineId,
    getRegisteredScenePipelineId,
} from "@/render/webgl/pipelineRegistry";
import { SCENE_REGISTRY } from "@/ui/scenes/sceneDefinitions";

describe("Scene pipeline registrations", () => {
    it("ensures every scene definition exposes a known pipeline id", () => {
        for (const scene of SCENE_REGISTRY.definitions) {
            expect(scene.renderPipelineId).toBeDefined();
            expect(typeof scene.renderPipelineId).toBe("string");
            expect(scene.renderPipelineId.length).toBeGreaterThan(0);

            const registeredSceneId = getRegisteredScenePipelineId(scene.id);
            const geometryPipelineId = getRegisteredGeometryPipelineId(scene.geometry);
            const defaultPipelineId = getRegisteredDefaultPipelineId();
            const knownIds = [
                registeredSceneId,
                geometryPipelineId,
                defaultPipelineId ?? undefined,
            ].filter((value): value is string => Boolean(value));

            expect(knownIds.includes(scene.renderPipelineId)).toBe(true);
        }
    });
});
