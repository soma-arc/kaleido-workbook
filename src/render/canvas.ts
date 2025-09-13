/**
 * Set the internal bitmap size of a canvas according to CSS size and DPR.
 * Does not touch styles; callers control CSS layout. Returns the DPR used.
 */
export function setCanvasDPR(canvas: HTMLCanvasElement, dpr?: number): number {
    const ratioRaw =
        typeof dpr === "number" && Number.isFinite(dpr) ? dpr : (globalThis.devicePixelRatio ?? 1);
    const ratio = Math.max(1, ratioRaw || 1);

    // Prefer layout box if available; fallback to current attributes.
    let cssW = canvas.width;
    let cssH = canvas.height;
    try {
        const rect = canvas.getBoundingClientRect?.();
        if (rect && rect.width > 0 && rect.height > 0) {
            cssW = rect.width;
            cssH = rect.height;
        }
    } catch {
        // ignore
    }

    const pxW = Math.max(1, Math.round(cssW * ratio));
    const pxH = Math.max(1, Math.round(cssH * ratio));
    canvas.width = pxW;
    canvas.height = pxH;
    return ratio;
}

/**
 * Attach a simple window resize listener and return a disposer.
 * The callback is invoked on each resize event.
 */
export function attachResize(_canvas: HTMLCanvasElement, onResize: () => void): () => void {
    const handler = () => onResize();
    globalThis.addEventListener("resize", handler);
    return () => globalThis.removeEventListener("resize", handler);
}
