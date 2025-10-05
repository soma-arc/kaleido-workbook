import type { TextureSourceKind, TextureUVTransform } from "@/render/webgl/textures";

export type TexturePreset = {
    id: string;
    label: string;
    description?: string;
    url: string;
    kind?: TextureSourceKind;
    transform?: TextureUVTransform;
};
