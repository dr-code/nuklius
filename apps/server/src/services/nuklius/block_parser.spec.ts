import { describe, it, expect } from "vitest";
import { parseBlocks } from "./block_parser.js";

describe("parseBlocks — basic extraction", () => {
    it("returns empty array for empty HTML", () => {
        expect(parseBlocks("")).toHaveLength(0);
        expect(parseBlocks("<p>No block IDs here</p>")).toHaveLength(0);
    });

    it("extracts a single block ID from a paragraph", () => {
        const html = '<p data-nuklius-block-id="abc-123">Hello world</p>';
        const blocks = parseBlocks(html);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].blockId).toBe("abc-123");
        expect(blocks[0].blockOrdinal).toBe(1);
    });

    it("extracts multiple blocks in document order", () => {
        const html = [
            '<p data-nuklius-block-id="id-1">First</p>',
            '<p data-nuklius-block-id="id-2">Second</p>',
            '<p data-nuklius-block-id="id-3">Third</p>'
        ].join("\n");
        const blocks = parseBlocks(html);
        expect(blocks).toHaveLength(3);
        expect(blocks.map(b => b.blockId)).toEqual(["id-1", "id-2", "id-3"]);
    });

    it("assigns 1-based ordinals sequentially", () => {
        const html = [
            '<p data-nuklius-block-id="a">A</p>',
            '<p data-nuklius-block-id="b">B</p>',
            '<p data-nuklius-block-id="c">C</p>'
        ].join("");
        const blocks = parseBlocks(html);
        expect(blocks.map(b => b.blockOrdinal)).toEqual([1, 2, 3]);
    });

    it("does not double-count nested addressed elements", () => {
        // If a parent has a block ID, its children should not be separately counted.
        const html = '<div data-nuklius-block-id="outer"><p data-nuklius-block-id="inner">text</p></div>';
        const blocks = parseBlocks(html);
        // Only the outer block should be returned (inner is a child, not top-level).
        expect(blocks).toHaveLength(1);
        expect(blocks[0].blockId).toBe("outer");
    });
});

describe("parseBlocks — preview extraction", () => {
    it("extracts text content as preview", () => {
        const html = '<p data-nuklius-block-id="x">Hello <strong>world</strong></p>';
        const blocks = parseBlocks(html);
        expect(blocks[0].preview).toBe("Hello world");
    });

    it("truncates preview to 120 characters", () => {
        const longText = "A".repeat(200);
        const html = `<p data-nuklius-block-id="y">${longText}</p>`;
        const blocks = parseBlocks(html);
        expect(blocks[0].preview).toHaveLength(120);
    });

    it("trims whitespace from preview", () => {
        const html = '<p data-nuklius-block-id="z">  spaced  </p>';
        const blocks = parseBlocks(html);
        expect(blocks[0].preview).toBe("spaced");
    });
});

describe("parseBlocks — heading and block types", () => {
    it("extracts block IDs from heading elements", () => {
        const html = [
            '<h2 data-nuklius-block-id="h2-id">Section</h2>',
            '<p data-nuklius-block-id="p-id">Content</p>'
        ].join("");
        const blocks = parseBlocks(html);
        expect(blocks).toHaveLength(2);
        expect(blocks[0].blockId).toBe("h2-id");
        expect(blocks[1].blockId).toBe("p-id");
    });

    it("ignores elements without block IDs", () => {
        const html = [
            '<p data-nuklius-block-id="keep">Kept</p>',
            '<p>No ID here</p>',
            '<div><span>Also no ID</span></div>'
        ].join("");
        const blocks = parseBlocks(html);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].blockId).toBe("keep");
    });
});
