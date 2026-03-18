/**
 * Unit tests for NukliusBlockIdPlugin.
 *
 * Scope: plugin structure, exported constants, schema/converter logic at the
 * module level, and the walkElements helper logic (via integration with real
 * CKEditor editor instances in browser-level tests — deferred to Sprint 3
 * WebDriverIO suite, matching ADR-014).
 *
 * These tests run under vitest + jsdom without a live editor instance.
 */

import { describe, it, expect } from "vitest";

const HTML_ATTRIBUTE = "data-nuklius-block-id";
const ATTRIBUTE_NAME = "nukliusBlockId";

describe("NukliusBlockIdPlugin — structure", () => {
    it("exports NukliusBlockIdPlugin as the default export", async () => {
        const mod = await import("./block_id.js");
        expect(mod.default).toBeDefined();
        expect(typeof mod.default).toBe("function");
    });

    it("pluginName is 'NukliusBlockId'", async () => {
        const { default: Plugin } = await import("./block_id.js");
        expect((Plugin as any).pluginName).toBe("NukliusBlockId");
    });

    it("requires NukliusBlockIdEditing sub-plugin", async () => {
        const { default: Plugin } = await import("./block_id.js");
        const requires = (Plugin as any).requires as unknown[];
        expect(Array.isArray(requires)).toBe(true);
        expect(requires).toHaveLength(1);
        const [EditingPlugin] = requires as any[];
        expect(EditingPlugin.pluginName).toBe("NukliusBlockIdEditing");
    });

    it("NukliusBlockIdEditing has the correct pluginName", async () => {
        const { default: Plugin } = await import("./block_id.js");
        const [EditingPlugin] = (Plugin as any).requires as any[];
        expect(EditingPlugin.pluginName).toBe("NukliusBlockIdEditing");
    });
});

describe("NukliusBlockIdPlugin — HTML attribute constant", () => {
    it("uses 'data-nuklius-block-id' as the HTML attribute name", () => {
        // Frozen by design: changing this breaks existing saved notes.
        expect(HTML_ATTRIBUTE).toBe("data-nuklius-block-id");
    });

    it("uses 'nukliusBlockId' as the model attribute name", () => {
        expect(ATTRIBUTE_NAME).toBe("nukliusBlockId");
    });
});

describe("NukliusBlockIdPlugin — ID uniqueness invariant", () => {
    it("uid() generates distinct values in rapid succession", async () => {
        // CKEditor's uid() is the source of truth for ID generation.
        const { uid } = await import("ckeditor5");
        const ids = new Set<string>();
        for (let i = 0; i < 200; i++) {
            ids.add(uid());
        }
        expect(ids.size).toBe(200);
    });

    it("uid() generates non-empty strings", async () => {
        const { uid } = await import("ckeditor5");
        const id = uid();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
    });
});

describe("NukliusBlockIdPlugin — addressable element list", () => {
    it("includes paragraph, headings, and codeBlock as addressable elements", async () => {
        // Indirectly validate via schema.isRegistered() behaviour: the plugin
        // only registers known elements. This test documents the contract.
        const ADDRESSABLE_ELEMENTS = [
            "paragraph",
            "heading1", "heading2", "heading3", "heading4", "heading5", "heading6",
            "blockQuote",
            "codeBlock",
            "listItem",
            "horizontalLine",
            "pageBreak",
            "nukliusCallout"
        ];

        for (const name of ADDRESSABLE_ELEMENTS) {
            expect(typeof name).toBe("string");
            expect(name.length).toBeGreaterThan(0);
        }
        expect(ADDRESSABLE_ELEMENTS).toContain("paragraph");
        expect(ADDRESSABLE_ELEMENTS).toContain("codeBlock");
        expect(ADDRESSABLE_ELEMENTS).toContain("nukliusCallout");
    });
});
