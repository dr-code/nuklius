# Architecture

> **This document is AUTHORITATIVE. No exceptions. No deviations.**
> **ALWAYS read this before making architectural changes.**

---

## System Overview

Nuklius is a local-first PKM + learning system for physicians built as a fork of
[TriliumNext/Trilium](https://github.com/TriliumNext/Trilium). Custom Nuklius code lives
entirely within `nuklius/` namespaced subdirectories inside the Trilium monorepo structure.

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ELECTRON DESKTOP (Mac)                          │
│                                                                          │
│  apps/desktop/src/nuklius/                                               │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │ claude/      │  │ embeddings/      │  │ pdf/                      │ │
│  │ cli_manager  │  │ transformers_    │  │ section_detector          │ │
│  │ mcp_bridge   │  │ worker + catch_  │  │ toc_lookup                │ │
│  │ prompt_build │  │ up               │  │ vision_extractor          │ │
│  └──────┬───────┘  └────────┬─────────┘  │ mega_prompt               │ │
│         │                   │            └───────────────────────────┘ │
│         │ IPC               │ IPC                                       │
└─────────┼───────────────────┼────────────────────────────────────────--┘
          │                   │
┌─────────▼───────────────────▼──────────────────────────────────────────┐
│                        apps/client (Browser/Electron renderer)          │
│                                                                          │
│  widgets/nuklius/              services/nuklius/                         │
│  brain_graph.ts                graph_store.ts                           │
│  mini_graph.ts                 ai_store.ts                              │
│  side_chat.ts                  pdf_store.ts                             │
│  pdf_learn_tab.ts              mastery_store.ts                         │
│  mastery_tracker.ts                                                      │
│  quiz_panel.ts                                                           │
│  flashcard_review.ts                                                     │
│  floating_toolbar.ts                                                     │
│  tutor_chat.ts                                                           │
│  auto_link_sidebar.ts                                                    │
│  daily_digest.ts                                                         │
│                                                                          │
│  packages/ckeditor5/src/plugins/nuklius/                                │
│  block_id.ts  medical_callout.ts  transclusion.ts  zoom.ts  ai_toolbar  │
└──────────────────────────┬─────────────────────────────────────────────┘
                           │ ETAPI REST + Trilium sync protocol
┌──────────────────────────▼─────────────────────────────────────────────┐
│                      apps/server (Trilium sync server)                  │
│                                                                          │
│  Trilium core: notes, branches, attributes, revisions, blobs (SQLite)  │
│  Becca in-memory cache: BNote, BBranch, BAttribute, BBlob              │
│  FTS5 full-text search                                                  │
│  ETAPI REST API (OpenAPI spec)                                          │
│                                                                          │
│  services/nuklius/ (custom)                                             │
│  vector_service.ts  mastery_service.ts  concept_service.ts             │
│  quiz_service.ts    pdf_section_service.ts  merge_service.ts           │
│                                                                          │
│  Custom tables: Nuklius_blocks, Nuklius_block_links,                   │
│  Nuklius_embeddings, Nuklius_concepts, Nuklius_mastery,                │
│  Nuklius_quiz_sessions, Nuklius_pdf_sections                           │
│                                                                          │
│  SQLite-vector extension (local V1 semantic search)                    │
│  Qdrant (optional, server/multi-user mode only)                        │
└─────────────────────────────────────────────────────────────────────────┘

packages/nuklius-mcp/
  MCP stdio server bridging ETAPI + vector intelligence for Claude CLI
  tools: search_notes, get_note, get_backlinks, query_blocks,
         get_related, vault_stats, mastery_query
```

---

## Workspace Boundaries (Module Ownership)

| Workspace | Owns | Does NOT touch |
|-----------|------|----------------|
| `apps/client` | UI widgets, services, CKEditor integration, layout | Server business logic, subprocess lifecycle |
| `apps/desktop` | Electron main process, Claude CLI subprocess, embedding worker, PDF pipeline | Server SQL, client rendering |
| `apps/server` | SQLite schema, Becca cache, ETAPI, sync protocol, Nuklius_* tables, custom routes | Electron IPC, Claude subprocess |
| `packages/ckeditor5` | Editor plugins under `plugins/nuklius/` | Server state, Electron IPC |
| `packages/nuklius-mcp` | MCP stdio server, tool definitions, ETAPI client wrapper | Direct SQLite, Electron APIs |

**Non-negotiable boundary rule:** All Nuklius-specific code lives under `nuklius/` namespaced
paths. This makes upstream Trilium merges conflict-free on our custom code.

---

## Source of Truth

| Data type | Storage |
|-----------|---------|
| Note content (HTML) | Trilium SQLite (`notes`, `blobs`) |
| Metadata (labels, relations) | Trilium SQLite (`attributes`) |
| Block IDs and index | `Nuklius_blocks` table |
| Block links | `Nuklius_block_links` table |
| Embeddings (V1 local) | SQLite-vector extension in same SQLite file |
| Embeddings (server mode) | Qdrant |
| Concept mastery | `Nuklius_mastery`, `Nuklius_concepts` tables |
| Quiz sessions | `Nuklius_quiz_sessions` table |
| PDF sections | `Nuklius_pdf_sections` table |
| Derived / cache | Becca in-memory cache, retrieval caches (evictable) |

---

## Trilium Baseline — Inherited for Free

- Electron shell (Mac, Windows, Linux) + pnpm monorepo build
- CKEditor 5 WYSIWYG (tables, images, KaTeX, code blocks, markdown autoformat)
- SQLite storage via better-sqlite3 with in-memory Becca cache
- FTS5 full-text search
- Note versioning (RevisionService)
- Bidirectional sync server with Docker Compose
- ETAPI REST API (OpenAPI spec)
- Per-note AES encryption
- Web/mobile client, web clipper
- Scripting system (frontend + backend APIs, custom widgets, event hooks)
- OpenID Connect + TOTP authentication

---

## Nuklius Extensions

### Phase-gated delivery (see Sprint Board)
- **Sprint 2**: Medical callout CKEditor plugins + domain-pack schema
- **Sprint 3**: Block addressing (^N) + Nuklius_blocks table
- **Sprint 4**: Block links, transclusion, enhanced backlinks
- **Sprint 5**: Domain hierarchy, zoom, block promotion
- **Sprint 6–7**: TheBrain-style ego-centric graph (mini + full)
- **Sprint 8–9**: Claude CLI manager + MCP bridge
- **Sprint 10**: SQLite-vector embedding pipeline + hybrid search
- **Sprint 11–12**: PDF section detection + vision extraction + mega-prompt
- **Sprint 13–14**: Learn tab + mastery + adaptive quiz
- **Sprint 15–16**: Side chat + auto-RAG + inline AI toolbar
- **Sprint 17–18**: Onboarding wizard + 6R pipeline
- **Sprint 19–20**: FSRS learning engine + productization

---

## Phase Gates (Never Bypass)

| Gate | End of Sprint | Criteria |
|------|--------------|----------|
| A | 7 | No-AI baseline usable: notes + linking + graph + PDF read |
| B | 12 | AI runtime stable: CLI manager + MCP + section intelligence |
| C | 14 | Learning loop: sections -> concepts -> mastery -> adaptive quiz |
| D | 20 | Release readiness: compliance + reliability + performance + security |

---

## Non-Negotiables

- App must remain independently useful with AI entirely disabled.
- All clinical AI outputs must include source attribution links.
- Export path exists that strips internal metadata artifacts (^N markers, Nuklius_ attrs).
- No blocking dependency on Yjs in V1; CRDT deferred to V2.
- CKEditor premium slash commands must not be used in distributed builds.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-18 | Sprint 1: Initial ARCHITECTURE.md from implementation plan (Trilium fork not yet cloned) |
