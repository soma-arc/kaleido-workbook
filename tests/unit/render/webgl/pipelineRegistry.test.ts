import { describe, expect, it } from "vitest";
import { GEOMETRY_KIND } from "@/geom/core/types";
import { resolveWebGLPipeline } from "@/render/webgl/pipelineRegistry";
import {
    EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID,
    EUCLIDEAN_HALF_PLANE_PIPELINE_ID,
    FACING_MIRROR_PIPELINE_ID,
    HYPERBOLIC_GEODESIC_PIPELINE_ID,
} from "@/render/webgl/pipelines/pipelineIds";
import { SCENE_IDS, SCENES_BY_ID } from "@/ui/scenes";
import type { SceneDefinition } from "@/ui/scenes/types";

import "@/render/webgl/pipelines/hyperbolicGeodesicPipeline";
import "@/render/webgl/pipelines/euclideanHalfPlanePipeline";
import "@/render/webgl/pipelines/euclideanCircleInversionPipeline";
import "@/render/webgl/pipelines/facingMirrorPipeline";

type MinimalSceneDefinition = Pick<
    SceneDefinition,
    | "key"
    | "label"
    | "supportsHandles"
    | "editable"
    | "description"
    | "allowPlaneDrag"
    | "renderPipelineId"
>;

const createBaseScene = (renderPipelineId: string): MinimalSceneDefinition => ({
    key: "test",
    label: "Test",
    supportsHandles: false,
    editable: false,
    renderPipelineId,
});

describe("resolveWebGLPipeline", () => {
    it("returns the hyperbolic pipeline for hyperbolic scenes", () => {
        const registration = resolveWebGLPipeline({
            ...createBaseScene(HYPERBOLIC_GEODESIC_PIPELINE_ID),
            id: `${GEOMETRY_KIND.hyperbolic}-sample`,
            geometry: GEOMETRY_KIND.hyperbolic,
            variant: "sample",
        });
        expect(registration.id).toBe(HYPERBOLIC_GEODESIC_PIPELINE_ID);
    });

    it("returns the euclidean pipeline for euclidean scenes", () => {
        const registration = resolveWebGLPipeline({
            ...createBaseScene(EUCLIDEAN_HALF_PLANE_PIPELINE_ID),
            id: `${GEOMETRY_KIND.euclidean}-sample`,
            geometry: GEOMETRY_KIND.euclidean,
            variant: "sample",
        });
        expect(registration.id).toBe(EUCLIDEAN_HALF_PLANE_PIPELINE_ID);
    });

    it("returns the inversion pipeline for the circle inversion scene", () => {
        const scene = SCENES_BY_ID[SCENE_IDS.euclideanCircleInversion];
        const registration = resolveWebGLPipeline(scene);
        expect(registration.id).toBe(EUCLIDEAN_CIRCLE_INVERSION_PIPELINE_ID);
    });

    it("returns the facing mirror pipeline for the facing-mirror scene", () => {
        const scene = SCENES_BY_ID[SCENE_IDS.facingMirrorRoom];
        const registration = resolveWebGLPipeline(scene);
        expect(registration.id).toBe(FACING_MIRROR_PIPELINE_ID);
    });
});
