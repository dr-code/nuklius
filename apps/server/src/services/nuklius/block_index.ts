/**
 * block_index.ts — maintains the nuklius_blocks index table.
 *
 * Responsibilities:
 *  - upsert block rows for a note after content changes
 *  - delete stale rows for blocks that were removed
 *  - full rebuild of all blocks across all text notes
 *  - ordinal-to-blockId and blockId-to-ordinal lookups
 */

import sql from "../sql.js";
import { parseBlocks } from "./block_parser.js";
import type { NukliusBlockRow } from "@triliumnext/commons";
import log from "../log.js";

// ----------------------------------------------------------------
// Public types
// ----------------------------------------------------------------

export interface BlockLocation {
    noteId: string;
    blockId: string;
    blockOrdinal: number;
    preview: string;
}

// ----------------------------------------------------------------
// Write path: index a note after content changes
// ----------------------------------------------------------------

/**
 * Re-index all blocks for a single note.  Safe to call after every save:
 * uses upsert semantics so existing IDs are preserved, and removes rows for
 * blocks that are no longer present in the HTML.
 *
 * @param noteId  The note's ID.
 * @param html    The current raw HTML content of the note.
 */
export function indexNote(noteId: string, html: string): void {
    const utcNow = new Date().toISOString();
    const blocks = parseBlocks(html);
    const incomingIds = new Set(blocks.map(b => b.blockId));

    // Upsert incoming blocks.
    for (const block of blocks) {
        sql.execute(
            `INSERT INTO nuklius_blocks (noteId, blockId, blockOrdinal, preview, utcDateModified)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (noteId, blockId) DO UPDATE SET
                 blockOrdinal = excluded.blockOrdinal,
                 preview      = excluded.preview,
                 utcDateModified = excluded.utcDateModified`,
            [noteId, block.blockId, block.blockOrdinal, block.preview, utcNow]
        );
    }

    // Remove rows for blocks no longer in the content.
    const existingIds: string[] = sql.getRows<{ blockId: string }>(
        "SELECT blockId FROM nuklius_blocks WHERE noteId = ?",
        [noteId]
    ).map(r => r.blockId);

    for (const existingId of existingIds) {
        if (!incomingIds.has(existingId)) {
            sql.execute(
                "DELETE FROM nuklius_blocks WHERE noteId = ? AND blockId = ?",
                [noteId, existingId]
            );
        }
    }
}

// ----------------------------------------------------------------
// Read path: lookups
// ----------------------------------------------------------------

/**
 * Resolve a 1-based ordinal ^N to a blockId for a given note.
 * Returns null if the ordinal is out of range or the note has no index.
 */
export function resolveOrdinal(
    noteId: string,
    blockOrdinal: number
): BlockLocation | null {
    return sql.getRowOrNull<BlockLocation>(
        `SELECT noteId, blockId, blockOrdinal, preview
         FROM nuklius_blocks
         WHERE noteId = ? AND blockOrdinal = ?`,
        [noteId, blockOrdinal]
    );
}

/**
 * Resolve a blockId to its current ordinal for a given note.
 * Returns null if the ID is not indexed.
 */
export function resolveBlockId(
    noteId: string,
    blockId: string
): BlockLocation | null {
    return sql.getRowOrNull<BlockLocation>(
        `SELECT noteId, blockId, blockOrdinal, preview
         FROM nuklius_blocks
         WHERE noteId = ? AND blockId = ?`,
        [noteId, blockId]
    );
}

/**
 * Return the full block map for a note, ordered by blockOrdinal.
 */
export function getBlockMap(noteId: string): BlockLocation[] {
    return sql.getRows<BlockLocation>(
        `SELECT noteId, blockId, blockOrdinal, preview
         FROM nuklius_blocks
         WHERE noteId = ?
         ORDER BY blockOrdinal ASC`,
        [noteId]
    );
}

// ----------------------------------------------------------------
// Rebuild utility
// ----------------------------------------------------------------

/**
 * Full rebuild of the nuklius_blocks index across all text notes.
 * Idempotent: running twice produces the same result.
 * Intended for operational recovery and post-import verification.
 *
 * @param progressCallback  Optional callback for progress reporting.
 */
export async function rebuildAll(
    progressCallback?: (done: number, total: number) => void
): Promise<void> {
    // Fetch all text notes that have HTML content.
    const noteIds: string[] = sql.getRows<{ noteId: string }>(
        `SELECT noteId FROM notes
         WHERE type = 'text' AND mime = 'text/html' AND isDeleted = 0`,
        []
    ).map(r => r.noteId);

    const total = noteIds.length;
    let done = 0;

    for (const noteId of noteIds) {
        try {
            const row = sql.getRowOrNull<{ content: string | null }>(
                `SELECT b.content FROM notes n
                 JOIN blobs b ON n.blobId = b.blobId
                 WHERE n.noteId = ?`,
                [noteId]
            );

            const html = row?.content ?? "";
            if (html) {
                indexNote(noteId, html);
            }
        } catch (err) {
            log.error(`nuklius block rebuild: error indexing note ${noteId}: ${err}`);
        }

        done++;
        if (progressCallback && done % 50 === 0) {
            progressCallback(done, total);
            // Yield to event loop to avoid blocking.
            await new Promise(resolve => setImmediate(resolve));
        }
    }

    progressCallback?.(total, total);
    log.info(`nuklius block rebuild complete: ${total} notes processed`);
}
