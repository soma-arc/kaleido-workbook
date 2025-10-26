export const HYPERBOLIC_ESCHER_SCENE_KEY = "hyperbolicEscher" as const;

export const ESCHER_PRESETS = [
    { id: "escher-264", label: "(2,6,4)", triple: { p: 2, q: 6, r: 4 } as const },
    { id: "escher-283", label: "(2,8,3)", triple: { p: 2, q: 8, r: 3 } as const },
] as const;

export const DEFAULT_ESCHER_PRESET_ID = ESCHER_PRESETS[0].id;
