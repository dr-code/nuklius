/**
 * block_index_listener.ts — subscribes to NOTE_CONTENT_CHANGE events and
 * keeps the nuklius_blocks index up to date automatically.
 *
 * Imported with side-effects in app.ts. The subscription is registered once
 * at startup and persists for the lifetime of the server process.
 */

import eventService from "../events.js";
import { indexNote } from "./block_index.js";
import sql from "../sql.js";
import log from "../log.js";

type BNote = {
    noteId: string;
    type: string;
    mime: string;
    blobId?: string;
};

eventService.subscribe(eventService.NOTE_CONTENT_CHANGE, ({ entity }: { entity: BNote }) => {
    if (entity.type !== "text" || entity.mime !== "text/html") {
        return;
    }

    try {
        const row = sql.getRowOrNull<{ content: string | null }>(
            `SELECT b.content FROM notes n
             JOIN blobs b ON n.blobId = b.blobId
             WHERE n.noteId = ?`,
            [entity.noteId]
        );

        // Index even when html is empty — indexNote will delete any stale rows.
        const html = row?.content ?? "";
        indexNote(entity.noteId, html);
    } catch (err) {
        // Non-fatal: log and continue. Block index is best-effort on write;
        // the rebuild utility can be used for recovery.
        log.error(`nuklius block index: failed to index note ${entity.noteId}: ${err}`);
    }
});
