/** Maximum number of texture layers supported by the renderer. */
export const MAX_TEXTURE_SLOTS = 2 as const;

/** Enumerates well-known texture slot indices. */
export const TEXTURE_SLOTS = {
    base: 0,
    camera: 1,
} as const;

export type TextureSlot = (typeof TEXTURE_SLOTS)[keyof typeof TEXTURE_SLOTS];

export type TextureSourceKind = "image" | "video" | "camera" | "canvas";

export interface TextureUVTransform {
    offset: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number;
}

export interface TextureSource {
    id: string;
    kind: TextureSourceKind;
    element: TexImageSource;
    width: number;
    height: number;
    ready?: boolean;
    dynamic?: boolean;
    onDispose?: () => void;
}

export interface SceneTextureLayer {
    slot: TextureSlot;
    kind: TextureSourceKind | "none";
    enabled: boolean;
    transform: TextureUVTransform;
    opacity: number;
}

export interface TextureLayer extends SceneTextureLayer {
    source: TextureSource | null;
}

export const IDENTITY_UV_TRANSFORM: TextureUVTransform = {
    offset: { x: 0.5, y: 0.5 },
    scale: { x: 0.5, y: 0.5 },
    rotation: 0,
};
