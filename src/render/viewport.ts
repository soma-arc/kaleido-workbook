export type Viewport = {
    scale: number; // pixels per world unit
    tx: number; // translation in pixels (x)
    ty: number; // translation in pixels (y)
};

export const identity: Viewport = { scale: 1, tx: 0, ty: 0 };

export function worldToScreen(vp: Viewport, p: { x: number; y: number }): { x: number; y: number } {
    const s = Math.max(0, Number.isFinite(vp.scale) ? vp.scale : 1);
    const tx = Number.isFinite(vp.tx) ? vp.tx : 0;
    const ty = Number.isFinite(vp.ty) ? vp.ty : 0;
    return { x: p.x * s + tx, y: p.y * s + ty };
}

export function screenToWorld(vp: Viewport, s: { x: number; y: number }): { x: number; y: number } {
    const sc = Number.isFinite(vp.scale) && vp.scale !== 0 ? vp.scale : 1;
    const tx = Number.isFinite(vp.tx) ? vp.tx : 0;
    const ty = Number.isFinite(vp.ty) ? vp.ty : 0;
    return { x: (s.x - tx) / sc, y: (ty - s.y) / sc };
}

/** Compose transforms: apply a then b (world -> a -> b). */
export function compose(b: Viewport, a: Viewport): Viewport {
    // b(a(p)) = (a.scale * p + a.t) * b.scale + b.t = (b.scale * a.scale) p + (b.scale * a.t + b.t)
    const scale = (b.scale || 1) * (a.scale || 1);
    return {
        scale,
        tx: (b.scale || 1) * a.tx + b.tx,
        ty: (b.scale || 1) * a.ty + b.ty,
    };
}

/** Inverse transform such that worldToScreen(invert(vp), screen) = world. */
export function invert(vp: Viewport): Viewport {
    const s = Number.isFinite(vp.scale) && vp.scale !== 0 ? vp.scale : 1;
    const invS = 1 / s;
    return {
        scale: invS,
        tx: -vp.tx * invS,
        ty: -vp.ty * invS,
    };
}
