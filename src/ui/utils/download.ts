/**
 * Triggers a browser download for the provided data URL.
 * Returns true when the operation has been attempted, false if the environment
 * does not provide a document (e.g. during SSR).
 */
export function downloadDataUrl(filename: string, dataUrl: string): boolean {
    if (typeof document === "undefined") {
        return false;
    }
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataUrl);
    anchor.setAttribute("download", filename);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    try {
        anchor.click();
        return true;
    } catch (error) {
        console.warn("[download] Failed to trigger download", error);
        return false;
    } finally {
        anchor.remove();
    }
}
