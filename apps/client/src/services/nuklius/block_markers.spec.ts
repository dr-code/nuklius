import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server.get and toast.showMessage before importing the module
vi.mock("../server.js", () => ({
    default: {
        get: vi.fn(async () => ({ blocks: [] }))
    }
}));
vi.mock("../toast.js", () => ({
    default: {
        showMessage: vi.fn()
    }
}));

import { renderMarkers, removeMarkers, scrollToBlock } from "./block_markers.js";

describe("block_markers — renderMarkers", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it("creates a marker for each addressed block", async () => {
        container.innerHTML = [
            '<p data-nuklius-block-id="b1">First</p>',
            '<p data-nuklius-block-id="b2">Second</p>'
        ].join("");

        await renderMarkers(container, "note1");

        const markers = container.querySelectorAll(".nuklius-block-marker");
        expect(markers.length).toBe(2);
    });

    it("labels markers with ordinals starting at 1", async () => {
        container.innerHTML = [
            '<p data-nuklius-block-id="b1">A</p>',
            '<p data-nuklius-block-id="b2">B</p>',
            '<p data-nuklius-block-id="b3">C</p>'
        ].join("");

        await renderMarkers(container, "note1");

        const markers = Array.from(
            container.querySelectorAll<HTMLElement>(".nuklius-block-marker")
        );
        expect(markers.map(m => m.textContent)).toEqual(["^1", "^2", "^3"]);
    });

    it("removes existing markers before re-rendering", async () => {
        container.innerHTML = '<p data-nuklius-block-id="b1">Content</p>';
        await renderMarkers(container, "note1");
        await renderMarkers(container, "note1");

        const markers = container.querySelectorAll(".nuklius-block-marker");
        expect(markers.length).toBe(1);
    });

    it("does nothing when no addressed blocks are present", async () => {
        container.innerHTML = "<p>No block IDs</p>";
        await renderMarkers(container, "note1");
        expect(container.querySelectorAll(".nuklius-block-marker").length).toBe(0);
    });
});

describe("block_markers — removeMarkers", () => {
    it("removes all markers from a container", async () => {
        const container = document.createElement("div");
        container.innerHTML = '<p data-nuklius-block-id="b1">Text</p>';
        document.body.appendChild(container);

        await renderMarkers(container, "note1");
        expect(container.querySelectorAll(".nuklius-block-marker").length).toBe(1);

        removeMarkers(container);
        expect(container.querySelectorAll(".nuklius-block-marker").length).toBe(0);

        document.body.removeChild(container);
    });
});

describe("block_markers — deep link format", () => {
    it("marker has a role='button' attribute for accessibility", async () => {
        const container = document.createElement("div");
        container.innerHTML = '<p data-nuklius-block-id="b1">Text</p>';
        document.body.appendChild(container);

        await renderMarkers(container, "note1");
        const marker = container.querySelector<HTMLElement>(".nuklius-block-marker");
        expect(marker?.getAttribute("role")).toBe("button");
        expect(marker?.getAttribute("tabindex")).toBe("0");

        document.body.removeChild(container);
    });
});

describe("block_markers — scrollToBlock", () => {
    it("scrolls to element with matching blockId", async () => {
        const container = document.createElement("div");
        container.innerHTML = '<p data-nuklius-block-id="target">Content</p>';
        document.body.appendChild(container);

        const el = container.querySelector<HTMLElement>('[data-nuklius-block-id="target"]')!;
        const scrollSpy = vi.fn();
        el.scrollIntoView = scrollSpy;

        await scrollToBlock(container, "note1", "target");
        expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });

        document.body.removeChild(container);
    });

    it("does not throw when blockId is not found in DOM", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        await expect(scrollToBlock(container, "note1", "nonexistent")).resolves.toBeUndefined();

        document.body.removeChild(container);
    });
});
