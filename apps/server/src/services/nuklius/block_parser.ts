/**
 * block_parser.ts — walks the HTML content of a text note and extracts
 * ordered block records based on `data-nuklius-block-id` attributes.
 *
 * Kept intentionally dependency-free (no becca, no DB) so it can be unit
 * tested and reused by the block index service.
 */

import { parseDocument, DomUtils } from "htmlparser2";
import { type Element as HtmlElement } from "domhandler";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface ParsedBlock {
    /** The stable UUID assigned by the CKEditor NukliusBlockId plugin. */
    blockId: string;
    /** 1-based ordinal position within the note (the ^N number). */
    blockOrdinal: number;
    /** Short text preview of the block content (first 120 chars, no tags). */
    preview: string;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const BLOCK_ID_ATTR = "data-nuklius-block-id";
const PREVIEW_MAX_LENGTH = 120;

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Parse the HTML content of a note and return an ordered list of blocks
 * that have `data-nuklius-block-id` attributes. The returned list is sorted
 * by document order (depth-first pre-order traversal).
 *
 * @param html Raw HTML string from `note.getContent()`.
 * @returns Array of ParsedBlock, ordered 1..N.
 */
export function parseBlocks(html: string): ParsedBlock[] {
    const dom = parseDocument(html, { decodeEntities: true });
    const results: ParsedBlock[] = [];
    let ordinal = 0;

    walkNodes(DomUtils.getChildren(dom), results, ordinal);

    // Re-number ordinally after walk (walkNodes mutates via reference counting)
    for (let i = 0; i < results.length; i++) {
        results[i].blockOrdinal = i + 1;
    }

    return results;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function walkNodes(
    nodes: ReturnType<typeof DomUtils.getChildren>,
    out: ParsedBlock[],
    _ordinal: number
): void {
    for (const node of nodes) {
        if (node.type !== "tag") continue;
        const el = node as HtmlElement;

        const blockId = el.attribs?.[BLOCK_ID_ATTR];
        if (blockId) {
            // Found an addressed block. Collect its text preview, do NOT recurse
            // into children for further addressed blocks (children of an addressed
            // block are not separately addressable at this level).
            out.push({
                blockId,
                blockOrdinal: 0, // renumbered after full walk
                preview: extractPreview(el)
            });
        } else {
            // Not addressed — recurse into children to find nested addressed blocks.
            walkNodes(DomUtils.getChildren(el) as any, out, _ordinal);
        }
    }
}

function extractPreview(el: HtmlElement): string {
    const text = DomUtils.textContent(el).replace(/\s+/g, " ").trim();
    return text.length > PREVIEW_MAX_LENGTH
        ? text.slice(0, PREVIEW_MAX_LENGTH)
        : text;
}
