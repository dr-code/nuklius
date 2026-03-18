/**
 * Integration tests for block_index.ts.
 *
 * These run against an in-memory copy of the integration test database
 * (loaded via TRILIUM_INTEGRATION_TEST=memory from spec/setup.ts).
 * We create the nuklius_blocks table manually before each test suite to
 * avoid depending on migration ordering.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import sql from "../sql.js";
import {
    indexNote,
    resolveOrdinal,
    resolveBlockId,
    getBlockMap
} from "./block_index.js";

// ----------------------------------------------------------------
// Table setup
// ----------------------------------------------------------------

const CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS nuklius_blocks (
        noteId      TEXT NOT NULL,
        blockId     TEXT NOT NULL,
        blockOrdinal INTEGER NOT NULL,
        preview     TEXT NOT NULL DEFAULT '',
        utcDateModified TEXT NOT NULL,
        PRIMARY KEY (noteId, blockId)
    )
`;

const CREATE_INDEX = `
    CREATE INDEX IF NOT EXISTS IDX_nuklius_blocks_noteId_ordinal
        ON nuklius_blocks (noteId, blockOrdinal)
`;

beforeAll(() => {
    sql.executeScript(CREATE_TABLE + ";\n" + CREATE_INDEX);
});

afterAll(() => {
    sql.execute("DROP TABLE IF EXISTS nuklius_blocks");
});

function clearTable() {
    sql.execute("DELETE FROM nuklius_blocks");
}

// ----------------------------------------------------------------
// indexNote
// ----------------------------------------------------------------

describe("indexNote", () => {
    it("upserts blocks parsed from HTML", () => {
        clearTable();
        indexNote(
            "note1",
            '<p data-nuklius-block-id="b1">First</p><p data-nuklius-block-id="b2">Second</p>'
        );
        const rows = getBlockMap("note1");
        expect(rows).toHaveLength(2);
        expect(rows[0].blockId).toBe("b1");
        expect(rows[0].blockOrdinal).toBe(1);
        expect(rows[1].blockId).toBe("b2");
        expect(rows[1].blockOrdinal).toBe(2);
    });

    it("is idempotent — re-indexing same content produces same result", () => {
        clearTable();
        const html = '<p data-nuklius-block-id="x1">A</p><p data-nuklius-block-id="x2">B</p>';
        indexNote("note2", html);
        indexNote("note2", html);
        const rows = getBlockMap("note2");
        expect(rows).toHaveLength(2);
        expect(rows.map(r => r.blockId)).toEqual(["x1", "x2"]);
    });

    it("removes stale rows for deleted blocks", () => {
        clearTable();
        indexNote("note3", '<p data-nuklius-block-id="old1">Old</p><p data-nuklius-block-id="old2">Old2</p>');
        expect(getBlockMap("note3")).toHaveLength(2);

        // Update: remove old2
        indexNote("note3", '<p data-nuklius-block-id="old1">Old</p>');
        const rows = getBlockMap("note3");
        expect(rows).toHaveLength(1);
        expect(rows[0].blockId).toBe("old1");
    });

    it("does nothing for empty HTML", () => {
        clearTable();
        indexNote("note4", "");
        expect(getBlockMap("note4")).toHaveLength(0);
    });
});

// ----------------------------------------------------------------
// resolveOrdinal
// ----------------------------------------------------------------

describe("resolveOrdinal", () => {
    beforeAll(() => {
        clearTable();
        indexNote("nr1", '<h2 data-nuklius-block-id="h1">Title</h2><p data-nuklius-block-id="p1">Para</p>');
    });

    it("returns the block for a valid ordinal", () => {
        const block = resolveOrdinal("nr1", 1);
        expect(block).not.toBeNull();
        expect(block!.blockId).toBe("h1");
        expect(block!.blockOrdinal).toBe(1);
    });

    it("returns null for an out-of-range ordinal", () => {
        expect(resolveOrdinal("nr1", 99)).toBeNull();
    });

    it("returns null for a non-existent note", () => {
        expect(resolveOrdinal("no-note", 1)).toBeNull();
    });
});

// ----------------------------------------------------------------
// resolveBlockId
// ----------------------------------------------------------------

describe("resolveBlockId", () => {
    beforeAll(() => {
        clearTable();
        indexNote("nb1", '<p data-nuklius-block-id="uuid-abc">Content</p>');
    });

    it("returns the block for a known blockId", () => {
        const block = resolveBlockId("nb1", "uuid-abc");
        expect(block).not.toBeNull();
        expect(block!.blockOrdinal).toBe(1);
    });

    it("returns null for an unknown blockId", () => {
        expect(resolveBlockId("nb1", "unknown-id")).toBeNull();
    });
});

// ----------------------------------------------------------------
// getBlockMap
// ----------------------------------------------------------------

describe("getBlockMap", () => {
    it("returns blocks ordered by ordinal ascending", () => {
        clearTable();
        indexNote(
            "nm1",
            [
                '<h1 data-nuklius-block-id="m1">H1</h1>',
                '<h2 data-nuklius-block-id="m2">H2</h2>',
                '<p data-nuklius-block-id="m3">P</p>'
            ].join("")
        );
        const map = getBlockMap("nm1");
        expect(map.map(b => b.blockOrdinal)).toEqual([1, 2, 3]);
        expect(map.map(b => b.blockId)).toEqual(["m1", "m2", "m3"]);
    });

    it("returns empty array for a note with no indexed blocks", () => {
        clearTable();
        expect(getBlockMap("empty-note")).toHaveLength(0);
    });
});
