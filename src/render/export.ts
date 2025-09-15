export type ExportOptions = { scale?: number; background?: string };

/**
 * Export current canvas content as PNG dataURL.
 * - scale: multiplies pixel dimensions (uses an intermediate canvas when !=1)
 * - background: optional fill color (e.g., "white"); otherwise transparent
 */
function safeToDataURL(canvas: HTMLCanvasElement): string | undefined {
    try {
        return canvas.toDataURL("image/png");
    } catch {
        return undefined;
    }
}

export function exportPNG(source: HTMLCanvasElement, opts: ExportOptions = {}): string {
    const scale =
        typeof opts.scale === "number" && isFinite(opts.scale) && opts.scale > 0 ? opts.scale : 1;
    // If no scaling and no background, delegate directly
    if (scale === 1 && !opts.background) {
        const d = safeToDataURL(source);
        if (typeof d === "string") return d;
    }
    const target = document.createElement("canvas");
    target.width = Math.max(1, Math.round(source.width * scale));
    target.height = Math.max(1, Math.round(source.height * scale));
    const ctx = target.getContext("2d");
    if (ctx) {
        if (opts.background) {
            ctx.save();
            ctx.fillStyle = opts.background;
            ctx.fillRect(0, 0, target.width, target.height);
            ctx.restore();
        }
        // drawImage is a no-op in jsdom, but safe; scale with drawImage when needed
        ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, target.width, target.height);
    }
    const data = safeToDataURL(target);
    return typeof data === "string" ? data : "data:image/png;base64,";
}
