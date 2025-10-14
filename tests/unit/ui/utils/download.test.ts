import { describe, expect, it, vi } from "vitest";

import { downloadDataUrl } from "../../../../src/ui/utils/download";

describe("downloadDataUrl", () => {
    it("creates an anchor and triggers download", () => {
        const anchor = document.createElement("a");
        const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
        const removeSpy = vi.spyOn(anchor, "remove");
        const createElementSpy = vi
            .spyOn(document, "createElement")
            .mockReturnValue(anchor as HTMLAnchorElement);
        const appendSpy = vi.spyOn(document.body, "appendChild");

        const result = downloadDataUrl("capture.png", "data:image/png;base64,abc");

        expect(result).toBe(true);
        expect(anchor.getAttribute("download")).toBe("capture.png");
        expect(anchor.getAttribute("href")).toBe("data:image/png;base64,abc");
        expect(appendSpy).toHaveBeenCalledWith(anchor);
        expect(clickSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();

        createElementSpy.mockRestore();
        appendSpy.mockRestore();
    });

    it("returns false when document is unavailable", () => {
        const globalRef = globalThis as { document?: Document };
        const original = globalRef.document;
        delete globalRef.document;
        expect(downloadDataUrl("test.png", "data:image/png;base64,xyz")).toBe(false);
        globalRef.document = original;
    });
});
