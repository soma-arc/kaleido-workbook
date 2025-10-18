import { GEOMETRY_KIND, type GeometryKind } from "@/geom/core/types";
import { halfPlaneFromNormalAndOffset, normalizeHalfPlane } from "@/geom/primitives/halfPlane";
import type { HalfPlaneControlPoints } from "@/geom/primitives/halfPlaneControls";
import { createRegularTetrahedronTriangle } from "@/geom/spherical/regularTetrahedron";
import type { SphericalSceneState } from "@/geom/spherical/types";
import { euclideanCircleInversionScene } from "@/scenes/euclidean/circle-inversion";
import { euclideanMultiPlaneScene } from "@/scenes/euclidean/multi-plane";
import { hyperbolicTripleReflectionScene } from "@/scenes/hyperbolic/tiling-333";
import { HalfPlaneOverlayControls } from "@/ui/components/HalfPlaneOverlayControls";
import type { TrianglePreset, TrianglePresetGroup } from "@/ui/trianglePresets";
import { createRegularPolygonSceneConfig } from "./regularPolygons";
import {
    createSceneId,
    type FacingMirrorSceneConfig,
    type SceneDefinition,
    type SceneDefinitionInput,
    type SceneId,
    type SceneRegistry,
} from "./types";

const SINGLE_HALF_PLANE = [halfPlaneFromNormalAndOffset({ x: 1, y: 0 }, 0)] as const;

const HINGE_HALF_PLANES = [
    normalizeHalfPlane({ anchor: { x: 0, y: 0 }, normal: { x: -1, y: 0 } }),
    normalizeHalfPlane({ anchor: { x: 0, y: 0 }, normal: { x: 0, y: 1 } }),
] as const;

const HINGE_INITIAL_CONTROL_POINTS: HalfPlaneControlPoints[] = [
    [
        { id: "hinge", x: 0, y: 0, fixed: true },
        { id: "hinge-plane-0-free", x: 0, y: 0.6, fixed: false },
    ],
    [
        { id: "hinge-plane-1-free", x: -0.8, y: 0, fixed: false },
        { id: "hinge", x: 0, y: 0, fixed: true },
    ],
];

const FACING_MIRROR_HALF_PLANES = [
    normalizeHalfPlane({ anchor: { x: -0.5, y: 0 }, normal: { x: 1, y: 0 } }),
    normalizeHalfPlane({ anchor: { x: 0.5, y: 0 }, normal: { x: -1, y: 0 } }),
] as const;

const FACING_MIRROR_CONFIG: FacingMirrorSceneConfig = {
    rectangleCenter: { x: 0, y: 0 },
    rectangleHalfExtents: { x: 0.25, y: 0.25 },
    fallbackColor: { r: 0.86, g: 0.89, b: 0.96, a: 0.95 },
};

const REGULAR_SQUARE_CONFIG = createRegularPolygonSceneConfig({
    sides: 4,
    radius: 0.7,
    initialAngle: Math.PI / 4,
});

const REGULAR_PENTAGON_CONFIG = createRegularPolygonSceneConfig({
    sides: 5,
    radius: 0.7,
    initialAngle: Math.PI / 2,
});

const REGULAR_HEXAGON_CONFIG = createRegularPolygonSceneConfig({
    sides: 6,
    radius: 0.7,
    initialAngle: Math.PI / 6,
});

function cloneHalfPlanes(
    planes: readonly { anchor: { x: number; y: number }; normal: { x: number; y: number } }[],
) {
    return planes.map((plane) =>
        normalizeHalfPlane({
            anchor: { x: plane.anchor.x, y: plane.anchor.y },
            normal: { x: plane.normal.x, y: plane.normal.y },
        }),
    );
}

function cloneControlPointsList(
    controlPoints: readonly [
        { id: string; x: number; y: number; fixed: boolean },
        { id: string; x: number; y: number; fixed: boolean },
    ][],
): [
    { id: string; x: number; y: number; fixed: boolean },
    { id: string; x: number; y: number; fixed: boolean },
][] {
    return controlPoints.map((pair) => [
        { id: pair[0].id, x: pair[0].x, y: pair[0].y, fixed: pair[0].fixed },
        { id: pair[1].id, x: pair[1].x, y: pair[1].y, fixed: pair[1].fixed },
    ]);
}

function cloneFacingMirrorConfig(config: FacingMirrorSceneConfig): FacingMirrorSceneConfig {
    return {
        rectangleCenter: { ...config.rectangleCenter },
        rectangleHalfExtents: { ...config.rectangleHalfExtents },
        fallbackColor: { ...config.fallbackColor },
    };
}

type SceneDefinitionEntry = SceneDefinitionInput & { key: SceneAlias };

const HYPERBOLIC_TRIPLE_REFLECTION_SCENE: SceneDefinitionEntry = {
    ...hyperbolicTripleReflectionScene,
};

const EUCLIDEAN_CIRCLE_INVERSION_SCENE: SceneDefinitionEntry = {
    ...euclideanCircleInversionScene,
};

const EUCLIDEAN_MULTI_PLANE_SCENE: SceneDefinitionEntry = {
    ...euclideanMultiPlaneScene,
};

type SceneAlias =
    | "hyperbolicTiling"
    | "hyperbolicTripleReflection"
    | "debugTexture"
    | "euclideanCameraDebug"
    | "euclideanSingleHalfPlane"
    | "euclideanHalfPlanes"
    | "euclideanHinge"
    | "euclideanCircleInversion"
    | "euclideanMultiPlane"
    | "facingMirrorRoom"
    | "euclideanRegularSquare"
    | "euclideanRegularPentagon"
    | "euclideanRegularHexagon"
    | "sphericalTetrahedron";

const BASE_SCENE_INPUTS: SceneDefinitionEntry[] = [
    {
        key: "hyperbolicTiling",
        label: "Hyperbolic Triangle",
        geometry: GEOMETRY_KIND.hyperbolic,
        variant: "tiling",
        description: "Generates a {p,q,r} hyperbolic tiling rendered inside the Poincaré disk.",
        supportsHandles: false,
        editable: false,
    },
    HYPERBOLIC_TRIPLE_REFLECTION_SCENE,
    {
        key: "debugTexture",
        label: "Debug Texture",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "debug-texture",
        description: "Renders the base texture in the viewport center for shader debugging.",
        supportsHandles: false,
        editable: false,
    },
    {
        key: "euclideanCameraDebug",
        label: "Camera Texture Debug",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "debug-camera",
        description:
            "Displays the live camera texture (enable from the Camera input panel) for pipeline debugging.",
        supportsHandles: false,
        editable: false,
        embedOverlayFactory: ({ controls }) => (
            <div style={{ display: "grid", gap: "12px" }}>
                {controls}
                <p
                    data-testid="camera-debug-overlay-note"
                    style={{ fontSize: "0.8rem", lineHeight: 1.5, opacity: 0.85 }}
                >
                    カメラ入力を有効化するとライブテクスチャのプレビューがここに表示されます。
                </p>
            </div>
        ),
    },
    {
        key: "euclideanHalfPlanes",
        label: "Euclidean Half-Planes",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "half-planes",
        description: "Interactive Euclidean mirrors derived from the current {p,q,r} triangle.",
        supportsHandles: true,
        editable: true,
        embedOverlayFactory: ({ controls, extras }) => {
            const context = (extras as {
                showHandles?: boolean;
                toggleHandles?: () => void;
                halfPlaneControls?: {
                    presetGroups: readonly TrianglePresetGroup[];
                    activePresetId?: string;
                    selectPreset: (preset: TrianglePreset) => void;
                    snapEnabled: boolean;
                    setSnapEnabled: (enabled: boolean) => void;
                };
            }) ?? { showHandles: false };
            if (!context.halfPlaneControls) {
                return controls ?? null;
            }
            const { halfPlaneControls } = context;
            const toggleHandles = context.toggleHandles ?? (() => {});
            return (
                <HalfPlaneOverlayControls
                    presetGroups={halfPlaneControls.presetGroups}
                    activePresetId={halfPlaneControls.activePresetId}
                    onSelectPreset={halfPlaneControls.selectPreset}
                    snapEnabled={halfPlaneControls.snapEnabled}
                    onSnapToggle={halfPlaneControls.setSnapEnabled}
                    showHandles={context.showHandles ?? false}
                    onToggleHandles={toggleHandles}
                />
            );
        },
    },
    {
        key: "euclideanSingleHalfPlane",
        label: "Single Half-Plane",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "single-half-plane",
        description: "One adjustable half-plane represented with draggable handles.",
        supportsHandles: true,
        editable: true,
        defaultHandleSpacing: 0.75,
        initialHalfPlanes: cloneHalfPlanes(SINGLE_HALF_PLANE),
    },
    {
        key: "euclideanHinge",
        label: "Hinge Mirrors",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "hinge",
        description: "Two mirrors share a fixed hinge; drag the free endpoints to rotate them.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        initialHalfPlanes: HINGE_HALF_PLANES.map((plane) => normalizeHalfPlane(plane)),
        controlAssignments: [
            { planeIndex: 0, pointIndex: 0, id: "hinge", fixed: true },
            { planeIndex: 1, pointIndex: 1, id: "hinge", fixed: true },
        ],
        initialControlPoints: cloneControlPointsList(HINGE_INITIAL_CONTROL_POINTS),
    },
    EUCLIDEAN_CIRCLE_INVERSION_SCENE,
    EUCLIDEAN_MULTI_PLANE_SCENE,
    {
        key: "facingMirrorRoom",
        label: "Facing Mirrors",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "facing-mirror-room",
        description:
            "Displays two opposing mirrors with a central square panel that can display textures.",
        supportsHandles: false,
        editable: false,
        allowPlaneDrag: false,
        initialHalfPlanes: cloneHalfPlanes(FACING_MIRROR_HALF_PLANES),
        facingMirrorConfig: cloneFacingMirrorConfig(FACING_MIRROR_CONFIG),
    },
    {
        key: "euclideanRegularSquare",
        label: "Regular Square",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-square",
        description: "Four half-planes form a square with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_SQUARE_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_SQUARE_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_SQUARE_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_SQUARE_CONFIG.initialControlPoints),
    },
    {
        key: "euclideanRegularPentagon",
        label: "Regular Pentagon",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-pentagon",
        description: "Five half-planes form a regular pentagon with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_PENTAGON_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_PENTAGON_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_PENTAGON_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_PENTAGON_CONFIG.initialControlPoints),
    },
    {
        key: "euclideanRegularHexagon",
        label: "Regular Hexagon",
        geometry: GEOMETRY_KIND.euclidean,
        variant: "regular-hexagon",
        description: "Six half-planes form a regular hexagon with shared draggable vertices.",
        supportsHandles: true,
        editable: true,
        allowPlaneDrag: false,
        defaultHandleSpacing: REGULAR_HEXAGON_CONFIG.defaultHandleSpacing,
        initialHalfPlanes: cloneHalfPlanes(REGULAR_HEXAGON_CONFIG.halfPlanes),
        controlAssignments: [...REGULAR_HEXAGON_CONFIG.controlAssignments],
        initialControlPoints: cloneControlPointsList(REGULAR_HEXAGON_CONFIG.initialControlPoints),
    },
    {
        key: "sphericalTetrahedron",
        label: "Spherical Triangle",
        geometry: GEOMETRY_KIND.spherical,
        variant: "tetrahedron",
        description:
            "Displays a regular tetrahedron face on the unit sphere with editable vertices.",
        supportsHandles: true,
        editable: true,
        initialSphericalState: {
            triangle: createRegularTetrahedronTriangle(0),
            handles: {},
        } satisfies SphericalSceneState,
    },
];

const SCENE_DEFINITIONS: SceneDefinition[] = BASE_SCENE_INPUTS.map((entry) => ({
    ...entry,
    id: createSceneId({ geometry: entry.geometry, variant: entry.variant }),
}));

type SceneIdMap = Record<SceneAlias, SceneId>;

export const SCENE_IDS: SceneIdMap = SCENE_DEFINITIONS.reduce((acc, scene) => {
    acc[scene.key as SceneAlias] = scene.id;
    return acc;
}, {} as SceneIdMap);

export const SCENES_BY_ID: Record<SceneId, SceneDefinition> = SCENE_DEFINITIONS.reduce(
    (acc, scene) => {
        acc[scene.id] = scene;
        return acc;
    },
    {} as Record<SceneId, SceneDefinition>,
);

export const SCENES_BY_GEOMETRY: Record<GeometryKind, SceneDefinition[]> = SCENE_DEFINITIONS.reduce(
    (acc, scene) => {
        acc[scene.geometry].push(scene);
        return acc;
    },
    {
        [GEOMETRY_KIND.hyperbolic]: [] as SceneDefinition[],
        [GEOMETRY_KIND.euclidean]: [] as SceneDefinition[],
        [GEOMETRY_KIND.spherical]: [] as SceneDefinition[],
    },
);

export const SCENE_ORDER: SceneId[] = SCENE_DEFINITIONS.map((scene) => scene.id);

export const DEFAULT_SCENE_ID: SceneId = SCENE_ORDER[0];

export const SCENE_REGISTRY: SceneRegistry = {
    definitions: SCENE_DEFINITIONS,
    byId: SCENES_BY_ID,
    order: SCENE_ORDER,
    byGeometry: SCENES_BY_GEOMETRY,
};
