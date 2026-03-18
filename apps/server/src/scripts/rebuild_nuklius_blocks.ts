/**
 * rebuild_nuklius_blocks.ts — CLI utility to rebuild the nuklius_blocks index.
 *
 * Usage:
 *   pnpm --filter @triliumnext/server rebuild-blocks
 *
 * This script initialises the database connection, runs a full rebuild of
 * the nuklius_blocks index, and exits. Safe to run against a live instance
 * (uses upsert + delete semantics) but for safety prefer to run it while
 * the server is stopped.
 */

import sql_init from "../services/sql_init.js";
import { rebuildAll } from "../services/nuklius/block_index.js";

async function main() {
    // Initialise DB (reads data directory from environment / config).
    sql_init.initializeDb();

    console.log("Starting nuklius_blocks rebuild…");

    await rebuildAll((done, total) => {
        process.stdout.write(`\r  ${done}/${total} notes processed`);
    });

    console.log("\nRebuild complete.");
    process.exit(0);
}

main().catch(err => {
    console.error("Rebuild failed:", err);
    process.exit(1);
});
