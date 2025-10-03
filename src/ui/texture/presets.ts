import gridTextureUrl from "@/assets/textures/grid.svg?url";
import type { TexturePreset } from "./types";

export const DEFAULT_TEXTURE_PRESETS: TexturePreset[] = [
    {
        id: "grid",
        label: "グリッド",
        description: "ハイパーボリック円板の基調確認用のグリッドテクスチャ",
        url: gridTextureUrl,
    },
];
