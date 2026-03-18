---
id: sprint-03
title: Sprint 3 — Block Addressing (^N)
edition: Nuklius
depends_on: [sprint-01, sprint-02]
source_files:
  - apps/client/vitest.config.mts
  - apps/client/src/test/setup.ts
  - apps/client/wdio.conf.ts
  - apps/client/tsconfig.wdio.json
  - apps/client/src/test/wdio/ckeditor.block_id.e2e.ts
  - apps/client/src/test/wdio/page_objects/ckeditor.page.ts
  - packages/ckeditor5/src/plugins/nuklius/block_id.ts
  - packages/ckeditor5/src/plugins.ts
  - packages/ckeditor5/src/index.ts
  - apps/client/src/widgets/type_widgets/ckeditor/config.ts
  - apps/server/src/assets/db/schema.sql
  - apps/server/src/migrations/migrations.ts
  - apps/server/src/services/app_info.ts
  - packages/commons/src/lib/rows.ts
  - apps/server/src/services/nuklius/block_parser.ts
  - apps/server/src/services/nuklius/block_index.ts
  - apps/server/src/services/nuklius/block_index_listener.ts
  - apps/server/src/routes/api/nuklius_blocks.ts
  - apps/server/src/routes/routes.ts
  - apps/server/src/app.ts
  - apps/server/src/scripts/rebuild_nuklius_blocks.ts
  - apps/client/src/services/nuklius/block_markers.ts
  - apps/client/src/widgets/type_widgets/editable_text.ts
  - apps/client/src/widgets/type_widgets/read_only_text.ts
  - apps/client/src/services/link.ts
  - apps/client/src/stylesheets/nuklius-block-markers.css
  - apps/client/src/stylesheets/style.css
  - apps/server/src/services/export/markdown.ts
  - apps/server/src/services/import/markdown.ts
routes:
  - GET /api/nuklius/blocks/:noteId/map
  - GET /api/nuklius/blocks/:noteId/ordinal/:n
  - GET /api/nuklius/blocks/:noteId/id/:blockId
  - POST /api/nuklius/blocks/rebuild
models:
  - nuklius_blocks
test_files:
  - packages/ckeditor5/src/plugins/nuklius/block_id.spec.ts
  - apps/server/src/services/nuklius/block_parser.spec.ts
  - apps/server/src/services/nuklius/block_index.spec.ts
  - apps/client/src/services/nuklius/block_markers.spec.ts
  - apps/server/src/services/export/markdown.spec.ts
  - apps/client/src/test/wdio/ckeditor.block_id.e2e.ts
known_issues:
  - Browser-level E2E (WebDriverIO) requires a running Nuklius server at NUKLIUS_BASE_URL; not run in standard CI
  - deep-link auto-scroll (blockId/block URL params → scrollToBlock) is parsed but navigation hook integration deferred to Sprint 4
  - CSS.escape used in block_markers.ts has a jsdom fallback; production browsers have full CSS.escape support
---

# Sprint 3 — Block Addressing (^N)

## Purpose

Assigns stable UUIDs (`data-nuklius-block-id`) to every content block in CKEditor, maintains a server-side index (`nuklius_blocks` table), renders visible `^N` anchor markers in the client, and preserves block IDs through markdown export/import round-trips. This is the foundation for all future Nuklius cross-referencing features (`^N` links, AI block citations, review markers).

## Prerequisites Fixed This Sprint

### jsdom Test Environment

`apps/client/vitest.config.mts` was missing `globals: true` and `setupFiles`. Without `setupFiles`, `setup.ts` was never loaded, so jQuery/WebSocket globals were absent and CKEditor config tests failed at module-load time.

Fixed by:
- Adding `globals: true` (so `describe`/`it` are available without explicit import in `i18n.spec.ts`)
- Adding `setupFiles: ["./src/test/setup.ts"]`
- Moving jQuery/WebSocket globals to module top-level in `setup.ts` (not inside `beforeAll`)
- Moving `vi.mock()` calls to module top-level so vitest's static hoisting fires before imports

Result: `config.spec.ts`, `link.spec.ts`, `i18n.spec.ts`, `highlights_list.spec.ts` all pass. Three pre-existing upstream failures remain (calendar off-by-one, help_button circular dep, utils SVG viewBox jsdom limitation) — out of scope.

### WebDriverIO Browser E2E Infrastructure

Added `wdio.conf.ts` (headless Chrome, 3 retries in CI, `NUKLIUS_BASE_URL` env), `tsconfig.wdio.json` (CommonJS for wdio), page object `CKEditorPage`, and a three-test suite validating block ID assignment, stability across save/reload, and `^N` marker rendering.

Run command: `pnpm --filter @triliumnext/client exec wdio run wdio.conf.ts`

## Architecture

```
Browser (CKEditor)                    Server
──────────────────────────────        ─────────────────────────────────
NukliusBlockId plugin (CKEditor)      nuklius_blocks table (SQLite)
  │  assigns data-nuklius-block-id      │
  │  to every block on post-fix         │
  ▼                                     │
BNote HTML saved                ──────► block_index_listener
                                          │  (NOTE_CONTENT_CHANGE event)
                                          ▼
Client block_markers.ts          block_index.ts
  │  reads DOM attributes    ◄───  getBlockMap() API
  │  fetches ordinals            /api/nuklius/blocks/:noteId/map
  │  renders ^N buttons
  ▼
User copies deep link: #blockId=<uuid>
    or ^N ordinal anchor
```

## Data Model

### nuklius_blocks (SQLite)

```sql
CREATE TABLE IF NOT EXISTS nuklius_blocks (
    noteId          TEXT NOT NULL,
    blockId         TEXT NOT NULL,         -- UUID from data-nuklius-block-id
    blockOrdinal    INTEGER NOT NULL,       -- 1-based position in note
    preview         TEXT NOT NULL DEFAULT '', -- first 120 chars of text content
    utcDateModified TEXT NOT NULL,
    PRIMARY KEY (noteId, blockId)
);
CREATE INDEX IDX_nuklius_blocks_noteId_ordinal ON nuklius_blocks (noteId, blockOrdinal);
```

Migration version: **233** (APP_DB_VERSION bumped from 232 → 233).

TypeScript row type: `NukliusBlockRow` in `packages/commons/src/lib/rows.ts`.

## CKEditor Plugin

**File:** `packages/ckeditor5/src/plugins/nuklius/block_id.ts`

### Addressable Elements

```typescript
const ADDRESSABLE_ELEMENTS = [
    "paragraph", "heading1", "heading2", "heading3", "heading4",
    "heading5", "heading6", "blockQuote", "codeBlock", "nukliusCallout"
];
```

### ID Assignment Rules

1. **Schema extension:** `nukliusBlockId` model attribute registered on all addressable elements via `schema.extend()`.
2. **Upcast:** `data-nuklius-block-id` HTML attribute → `nukliusBlockId` model attribute on load.
3. **Downcast:** `nukliusBlockId` → `data-nuklius-block-id` HTML attribute on save.
4. **Post-fixer:** After every model change, walks all elements. Assigns `uid()` to any element missing the attribute. Also regenerates IDs for copy/paste duplicates (tracks seen IDs in a `Set`). Returns `true` if any change was made (triggers another post-fixer cycle until stable).

### Config

```typescript
// apps/client/src/widgets/type_widgets/ckeditor/config.ts
nukliusBlockId: { enabled: true }
```

`packages/ckeditor5/src/index.ts` augments `EditorConfig` with `nukliusBlockId?: { enabled?: boolean }`.

## Server Services

### block_parser.ts

`parseBlocks(html: string): ParsedBlock[]` — uses `htmlparser2` to walk HTML. Extracts `data-nuklius-block-id` from addressable block tags, assigns 1-based ordinals, truncates text content to 120-char preview. Does NOT recurse into children of an addressed block.

### block_index.ts

- `indexNote(noteId, html)` — upsert all blocks via `ON CONFLICT DO UPDATE`, then delete stale rows for this note. Safe to call with empty html (purges all rows).
- `resolveOrdinal(noteId, n)` → `BlockLocation | null`
- `resolveBlockId(noteId, blockId)` → `BlockLocation | null`
- `getBlockMap(noteId)` → `NukliusBlockRow[]` ordered by `blockOrdinal ASC`
- `rebuildAll(progressCallback?)` — batch-safe, yields to event loop every 50 notes

### block_index_listener.ts

Side-effect module imported in `app.ts`. Subscribes to `eventService.NOTE_CONTENT_CHANGE`. For `text/html` notes, reads blob content and calls `indexNote()`. Calls `indexNote` even with empty content to purge stale rows.

## API Routes

All routes are registered under `/api/nuklius/blocks/` via `apiRoute`/`asyncApiRoute` (Trilium's auth + CSRF pattern). Handlers return data (not `res.json()`) so `apiResultHandler` sends the response.

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/nuklius/blocks/:noteId/map` | `{ noteId, blocks: NukliusBlockRow[] }` |
| GET | `/api/nuklius/blocks/:noteId/ordinal/:n` | `BlockLocation` or `[404, { message }]` |
| GET | `/api/nuklius/blocks/:noteId/id/:blockId` | `BlockLocation` or `[404, { message }]` |
| POST | `/api/nuklius/blocks/rebuild` | `{ message }` (async, fire-and-forget) |

`triggerRebuild` sets `(res as any).triliumResponseHandled = true` after calling `res.json()` because it responds immediately before the async rebuild completes.

### Rebuild Script

```bash
node apps/server/dist/scripts/rebuild_nuklius_blocks.js
# or via pnpm:
pnpm --filter @triliumnext/server rebuild-blocks
```

## Client Marker UX

**File:** `apps/client/src/services/nuklius/block_markers.ts`

### renderMarkers(container, noteId)

1. Scan `container` for elements with `data-nuklius-block-id`.
2. Skip elements that already have a marker (deduplication).
3. Attach `<button class="nuklius-block-marker" aria-label="^N">^N</button>` as the first child.
4. Fetch `/api/nuklius/blocks/:noteId/map` asynchronously; update button labels and `data-ordinal` attributes with resolved ordinals.
5. Wire click handler: copy deep-link URL (`#blockId=<uuid>`) to clipboard, show toast.

### removeMarkers(container)

Remove all `.nuklius-block-marker` elements from the container.

### scrollToBlock(container, noteId, blockId, ordinal?)

Find element by `[data-nuklius-block-id]` attribute, scroll into view, apply `.nuklius-block-highlight` flash animation. Falls back to ordinal resolution via API if `blockId` alone is not found.

### Widget Integration

- **editable_text.ts:** `renderMarkers` called at end of `doRefresh`. `change:data` event triggers re-render with 1-second debounce. `removeMarkers` called in `cleanup()`.
- **read_only_text.ts:** `renderMarkers` called after content loads in `doRefresh`. `removeMarkers` in `cleanup()`.

### CSS

`apps/client/src/stylesheets/nuklius-block-markers.css` — imported via `style.css`. Markers are hidden by default, visible on hover/focus. `@media print` hides all markers.

## Link Parsing

`apps/client/src/services/link.ts` — `blockId` and `block` URL hash parameters are now recognized (previously logged as "Unrecognized param"). Full navigation-to-block integration (auto-scroll on note load from deep link) is deferred to Sprint 4.

## Markdown Export/Import Round-Trip

### Export

`apps/server/src/services/export/markdown.ts` — uses `addRule("nukliusBlockId", ...)` to preserve `data-nuklius-block-id` elements as raw HTML in Turndown output. `addRule` is used instead of `keep()` because `keep()` does not override the default `paragraph` rule; `addRule` registers a higher-priority rule that matches first.

```typescript
instance.addRule("nukliusBlockId", {
    filter(node) {
        return typeof (node as any).getAttribute === "function" &&
            !!(node as any).getAttribute("data-nuklius-block-id");
    },
    replacement(_content, node) {
        return "\n\n" + (node as any).outerHTML + "\n\n";
    }
});
```

Duck-typing is used because Node.js has no global `HTMLElement`.

### Import

No special import logic required. Trilium's `sanitize-html` allowlist includes `data-*` attributes, so `data-nuklius-block-id` passes through the sanitizer intact during markdown import. The `data-*` allowlist already existed in the upstream codebase.

## Validation Commands

```bash
# Client unit tests (includes block_markers.spec.ts, config.spec.ts, link.spec.ts)
pnpm --filter @triliumnext/client exec vitest run

# Server unit tests (includes block_parser, block_index, markdown round-trip)
pnpm --filter @triliumnext/server exec vitest run

# Targeted nuklius server tests only
pnpm --filter @triliumnext/server exec vitest run src/services/nuklius/

# Markdown export round-trip (24 tests, 3 new block-id tests)
pnpm --filter @triliumnext/server exec vitest run src/services/export/markdown.spec.ts

# CKEditor plugin unit tests
pnpm --filter @triliumnext/ckeditor5 exec vitest run

# Browser E2E (requires live server at NUKLIUS_BASE_URL)
NUKLIUS_BASE_URL=http://localhost:8080 \
  pnpm --filter @triliumnext/client exec wdio run wdio.conf.ts

# Rebuild block index (operational recovery)
pnpm --filter @triliumnext/server rebuild-blocks

# Full monorepo test
pnpm test
```

## Known Limitations

1. **Browser E2E requires live server.** The WebDriverIO suite (`ckeditor.block_id.e2e.ts`) requires a running Nuklius instance at `NUKLIUS_BASE_URL`. Not run in standard unit test CI. Run manually or in a dedicated E2E CI job.

2. **Deep-link auto-scroll not wired.** `blockId` and `block` URL hash params are parsed into `viewScope` by `link.ts` but no navigation handler calls `scrollToBlock()` after note content renders. Full deep-link navigation is Sprint 4.

3. **Nested addressed blocks.** `block_parser.ts` does not recurse into children of an addressed block. If a `<div data-nuklius-block-id="...">` contains a `<p data-nuklius-block-id="...">`, the inner `<p>` is silently skipped. The CKEditor plugin prevents this at edit time (addressable elements are not allowed inside each other in schema), but hand-crafted HTML could trigger it.

4. **becca_loader unhandled rejection.** Pre-existing circular dependency in the Trilium codebase (`sql.ts → becca_loader.ts → sqlInit.dbReady` before `initializeDb()` is called). All 883 server tests pass but the process exits with code 1 due to this rejection. Out of scope for Sprint 3.

---

## Sprint 4 Prompt

> Sprint 4 — Deep-Link Navigation + Block Citation UI
>
> Prerequisites: Sprint 3 complete. `blockId` and `block` URL params are parsed in `viewScope` but not consumed.
>
> Engineering tasks:
> - `apps/client/src/services/navigation.ts` or equivalent — after note content renders, check `viewScope.blockId` / `viewScope.block`, resolve to block element, call `scrollToBlock()`.
> - `apps/client/src/widgets/type_widgets/editable_text.ts` — hook into post-refresh lifecycle to trigger block scroll.
> - `apps/client/src/widgets/type_widgets/read_only_text.ts` — same hook for read-only mode.
> - Citation UI: hovering a `^N` marker shows a tooltip with block preview (from `preview` field in `nuklius_blocks`). Fetch preview from `/api/nuklius/blocks/:noteId/map`.
> - `^N` inline references in note text: detect `^[0-9]+` patterns and render as clickable links that navigate to block within same note.
> - Rate-limit / cancel in-flight fetch in `block_markers.ts` when `renderMarkers` is called again before previous fetch completes.
>
> Acceptance:
> - Pasting `#blockId=<uuid>` in the address bar navigates to and highlights the correct block.
> - Hovering a `^N` marker shows the block preview text in a tooltip.
> - Inline `^N` references are clickable and scroll to the correct block.
>
> Constraints: pnpm monorepo, Node 22.16.0, AGPL-3.0, packages/ckeditor5 MUST NOT import from apps/*, all Nuklius code under nuklius/ namespaces.
