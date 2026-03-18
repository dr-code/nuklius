# Architecture Summary

> Full architecture detail: `docs/ARCHITECTURE.md`

## System Overview

Nuklius is a local-first PKM + learning system for physicians, built as a fork of
TriliumNext/Trilium. It inherits Trilium's Electron shell, CKEditor 5, SQLite + Becca cache,
FTS5 search, sync server, ETAPI, and scripting. Nuklius layers on top: a TheBrain-style
ego-centric graph, block-addressable knowledge model, PDF learning pipeline with mastery
tracking, Claude CLI + MCP orchestration, and medicine-first domain extensions.

## Service Boundaries

| Layer | Owns | Key Constraint |
|-------|------|----------------|
| `apps/desktop` | Electron main process, Claude CLI subprocess, embedding worker, PDF pipeline | No direct server SQL |
| `apps/client` | UI widgets, graph, editor plugins, layout | No server business logic |
| `apps/server` | SQLite schema, Becca cache, ETAPI, sync, `Nuklius_*` tables | No Electron IPC |
| `packages/ckeditor5` | Editor plugins under `plugins/nuklius/` | No server state |
| `packages/nuklius-mcp` | MCP stdio server, ETAPI client wrapper, tool definitions | No direct SQLite |

**Rule:** All custom Nuklius code lives under `nuklius/` namespaced paths within each workspace.

## Data Flow

1. User types in `apps/client` (CKEditor) → content saved to SQLite HTML-in-SQLite via server ETAPI
2. On save, `apps/desktop` embedding worker picks up new/changed notes → generates embeddings → stores in SQLite-vector (V1) or Qdrant (server mode)
3. Claude CLI invoked from `apps/desktop/claude/cli_manager.ts` → reads vault via MCP tools in `packages/nuklius-mcp` → ETAPI → server → SQLite
4. Graph built in `apps/client/widgets/nuklius/brain_graph.ts` → queries block index and link tables via custom server routes → renders with D3

## Core Invariants

1. App must work offline with no AI configured.
2. All clinical AI outputs include source attribution links.
3. Export path strips internal metadata (`^N` markers, `Nuklius_*` attributes).
4. No Yjs CRDT in V1 — HTML-in-SQLite is canonical.
5. CKEditor premium slash features are excluded from distributed builds.
6. All `Nuklius_*` custom tables have per-type merge rules (never overwrite — union or LWW).

## Key Decisions

1. **Trilium fork, not blank slate** (ADR-011): ~38 weeks of infrastructure inherited for free;
   AGPL-3.0 requires derivative to remain open-source.
2. **SQLite-vector for V1 local mode** (sprint board locked decision): no Qdrant dependency for
   personal V1; Qdrant is optional for server/multi-user mode.
3. **pnpm + corepack for toolchain pinning** (ADR-003, ADR-007): reproducible environments
   across CI and local dev via frozen lockfile and `packageManager` field.
