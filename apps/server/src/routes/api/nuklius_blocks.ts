/**
 * nuklius_blocks.ts — REST API for the Nuklius block addressing system.
 *
 * Routes (all under /api/nuklius/blocks/):
 *   GET  /api/nuklius/blocks/:noteId/map          — full block map for a note
 *   GET  /api/nuklius/blocks/:noteId/ordinal/:n   — resolve ^N to blockId
 *   GET  /api/nuklius/blocks/:noteId/id/:blockId  — resolve blockId to ordinal
 *   POST /api/nuklius/blocks/rebuild              — trigger full index rebuild
 *
 * Handlers return data (or [statusCode, data] tuples) rather than calling
 * res.json() directly, so that Trilium's apiResultHandler sends the response.
 */

import type { Request, Response } from "express";
import * as blockIndex from "../../services/nuklius/block_index.js";
import log from "../../services/log.js";

// ----------------------------------------------------------------
// GET /api/nuklius/blocks/:noteId/map
// ----------------------------------------------------------------

export function getBlockMap(req: Request) {
    const { noteId } = req.params;
    const blocks = blockIndex.getBlockMap(noteId);
    return { noteId, blocks };
}

// ----------------------------------------------------------------
// GET /api/nuklius/blocks/:noteId/ordinal/:n
// ----------------------------------------------------------------

export function resolveOrdinal(req: Request) {
    const { noteId, n } = req.params;
    const ordinal = parseInt(n, 10);

    if (!Number.isInteger(ordinal) || ordinal < 1) {
        return [400, { message: "Ordinal must be a positive integer." }];
    }

    const block = blockIndex.resolveOrdinal(noteId, ordinal);
    if (!block) {
        return [404, { message: `Block ^${ordinal} not found in note ${noteId}.` }];
    }

    return block;
}

// ----------------------------------------------------------------
// GET /api/nuklius/blocks/:noteId/id/:blockId
// ----------------------------------------------------------------

export function resolveBlockId(req: Request) {
    const { noteId, blockId } = req.params;

    const block = blockIndex.resolveBlockId(noteId, blockId);
    if (!block) {
        return [404, { message: `Block ${blockId} not found in note ${noteId}.` }];
    }

    return block;
}

// ----------------------------------------------------------------
// POST /api/nuklius/blocks/rebuild
// ----------------------------------------------------------------

export async function triggerRebuild(_req: Request, res: Response) {
    log.info("nuklius block rebuild triggered via API");

    // Respond immediately; rebuild runs asynchronously.
    // Set triliumResponseHandled so the framework doesn't try to send a second response.
    res.json({ message: "Rebuild started. Check server logs for progress." });
    (res as any).triliumResponseHandled = true;

    try {
        await blockIndex.rebuildAll((done, total) => {
            log.info(`nuklius block rebuild: ${done}/${total}`);
        });
    } catch (err) {
        log.error(`nuklius block rebuild failed: ${err}`);
    }
}

export default {
    getBlockMap,
    resolveOrdinal,
    resolveBlockId,
    triggerRebuild
};
