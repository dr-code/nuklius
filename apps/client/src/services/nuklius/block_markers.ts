/**
 * block_markers.ts — decorates addressed blocks with visible ^N anchors.
 *
 * Responsibilities:
 *  - scan an editable/read-only container for data-nuklius-block-id elements
 *  - render a compact ^N label (ordinal from server or fallback DOM order)
 *  - wire copy-to-clipboard on click
 *  - expose a scrollToBlock helper for deep-link navigation
 *
 * Design: purely DOM-based. Does not call the server API for ordinals — uses
 * DOM order as a local estimate, then overwrites once the server responds.
 * This keeps rendering fast without any network round-trip on every edit.
 */

import server from "../server.js";
import toast from "../toast.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const BLOCK_ID_ATTR = "data-nuklius-block-id";
const MARKER_CLASS = "nuklius-block-marker";
const MARKER_DATA_KEY = "data-nuklius-ordinal";

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Render ^N markers for all addressed blocks within a container element.
 * Safe to call repeatedly — existing markers are removed and re-created.
 *
 * @param container  The root element to scan (editor content area or
 *                   read-only text container).
 * @param noteId     The note ID, used to build deep links.
 */
export async function renderMarkers(
    container: HTMLElement,
    noteId: string
): Promise<void> {
    // Remove existing markers first.
    for (const el of container.querySelectorAll<HTMLElement>(`.${MARKER_CLASS}`)) {
        el.remove();
    }

    const blocks = container.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`);
    if (blocks.length === 0) return;

    // Assign DOM-order ordinals immediately (fast path, no network call).
    blocks.forEach((block, index) => {
        const ordinal = index + 1;
        attachMarker(block, ordinal, noteId);
    });

    // Asynchronously fetch the server-side ordinals and update labels.
    try {
        const response = await server.get<{ blocks: BlockLocation[] }>(
            `nuklius/blocks/${encodeURIComponent(noteId)}/map`
        );
        if (!response?.blocks) return;

        const ordinalMap = new Map(
            response.blocks.map(b => [b.blockId, b.blockOrdinal])
        );

        blocks.forEach(block => {
            const blockId = block.getAttribute(BLOCK_ID_ATTR);
            if (!blockId) return;
            const serverOrdinal = ordinalMap.get(blockId);
            if (serverOrdinal === undefined) return;

            const marker = block.querySelector<HTMLElement>(`.${MARKER_CLASS}`);
            if (marker) {
                marker.textContent = `^${serverOrdinal}`;
                marker.setAttribute(MARKER_DATA_KEY, String(serverOrdinal));
            }
        });
    } catch {
        // Non-fatal: markers already show DOM-order ordinals as fallback.
    }
}

/**
 * Remove all markers from a container (e.g., before widget teardown).
 */
export function removeMarkers(container: HTMLElement): void {
    for (const el of container.querySelectorAll<HTMLElement>(`.${MARKER_CLASS}`)) {
        el.remove();
    }
}

/**
 * Scroll to the block with the given blockId within a container.
 * Falls back to ordinal lookup via the API if blockId is not found in DOM.
 *
 * @param container  Root element to search within.
 * @param noteId     The note's ID.
 * @param blockId    The stable UUID of the block. Pass null to use ordinal.
 * @param ordinal    Fallback 1-based ordinal if blockId lookup fails.
 */
export async function scrollToBlock(
    container: HTMLElement,
    noteId: string,
    blockId: string | null,
    ordinal?: number
): Promise<void> {
    // Direct DOM lookup by blockId.
    if (blockId) {
        const el = container.querySelector<HTMLElement>(
            `[${BLOCK_ID_ATTR}="${escapeAttr(blockId)}"]`
        );
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightBlock(el);
            return;
        }
    }

    // Fallback: ask the server for the blockId using the ordinal.
    if (ordinal !== undefined) {
        try {
            const response = await server.get<BlockLocation>(
                `nuklius/blocks/${encodeURIComponent(noteId)}/ordinal/${ordinal}`
            );
            if (response?.blockId) {
                const el = container.querySelector<HTMLElement>(
                    `[${BLOCK_ID_ATTR}="${escapeAttr(response.blockId)}"]`
                );
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    highlightBlock(el);
                }
            }
        } catch {
            // Silently ignore — block may not be indexed yet.
        }
    }
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

interface BlockLocation {
    noteId: string;
    blockId: string;
    blockOrdinal: number;
    preview: string;
}

function attachMarker(
    block: HTMLElement,
    ordinal: number,
    noteId: string
): void {
    const blockId = block.getAttribute(BLOCK_ID_ATTR) ?? "";
    const marker = document.createElement("span");
    marker.className = MARKER_CLASS;
    marker.textContent = `^${ordinal}`;
    marker.setAttribute(MARKER_DATA_KEY, String(ordinal));
    marker.title = `Copy block link ^${ordinal}`;
    marker.setAttribute("role", "button");
    marker.setAttribute("tabindex", "0");

    marker.addEventListener("click", e => {
        e.stopPropagation();
        e.preventDefault();
        const deepLink = buildDeepLink(noteId, blockId, ordinal);
        copyToClipboard(deepLink, ordinal);
    });

    marker.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            marker.click();
        }
    });

    // Insert at the start of the block element.
    block.insertBefore(marker, block.firstChild);
}

function buildDeepLink(noteId: string, blockId: string, ordinal: number): string {
    // Format: #noteId?blockId=<uuid> (deep link for the Trilium note link protocol)
    // The ^N ordinal is human-readable; blockId is the stable anchor.
    const base = `#${noteId}`;
    const params = new URLSearchParams();
    if (blockId) params.set("blockId", blockId);
    params.set("block", String(ordinal));
    return `${base}?${params.toString()}`;
}

function copyToClipboard(text: string, ordinal: number): void {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            toast.showMessage(`Block link ^${ordinal} copied`);
        }).catch(() => fallbackCopy(text, ordinal));
    } else {
        fallbackCopy(text, ordinal);
    }
}

function fallbackCopy(text: string, ordinal: number): void {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast.showMessage(`Block link ^${ordinal} copied`);
}

/** Escape a value for use as an HTML attribute selector. */
function escapeAttr(value: string): string {
    return value.replace(/["\\]/g, "\\$&");
}

function highlightBlock(el: HTMLElement): void {
    el.classList.add("nuklius-block-highlight");
    setTimeout(() => el.classList.remove("nuklius-block-highlight"), 1800);
}
