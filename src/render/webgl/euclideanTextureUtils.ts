import type { TextureUVTransform } from "./textures";

type Vec2 = { x: number; y: number };

function rotate(point: Vec2, angle: number): Vec2 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x: point.x * c - point.y * s,
        y: point.x * s + point.y * c,
    };
}

function applyTransform(world: Vec2, transform: TextureUVTransform): Vec2 {
    const scaled: Vec2 = {
        x: world.x * transform.scale.x,
        y: world.y * transform.scale.y,
    };
    const rotated = rotate(scaled, transform.rotation);
    return {
        x: rotated.x + transform.offset.x,
        y: rotated.y + transform.offset.y,
    };
}

export function mirrorRepeat(value: number): number {
    const period = 2;
    let wrapped = value % period;
    if (Number.isNaN(wrapped)) return 0.5;
    if (wrapped < 0) {
        wrapped += period;
    }
    return wrapped <= 1 ? wrapped : 2 - wrapped;
}

export function computeReflectiveUV(
    world: Vec2,
    transform: TextureUVTransform,
): { u: number; v: number } {
    const uv = applyTransform(world, transform);
    return { u: mirrorRepeat(uv.x), v: mirrorRepeat(uv.y) };
}
