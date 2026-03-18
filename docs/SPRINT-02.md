# Sprint 2 — Medicine-First Callouts and Domain Pack Schema

**Sprint objective:** Implement medicine-first callouts via profession-extensible domain-pack model.
**Duration:** 2 weeks
**Total estimate:** 42 SP
**Status:** CLOSED — 2026-03-18

---

## Sprint Summary

| Item | Value |
|------|-------|
| Objective | Medicine-first callouts + domain-pack schema v1 |
| Epics | CKEditor callout plugin, Domain-pack schema v1 |
| Dependency tags | DEP-EDITOR, DEP-DOMAIN-PACKS |
| Risk flags | R-DOMAIN-GENERALIZATION |
| Gate | None (pre-Gate A) |

---

## Deliverables

### 1. `apps/server/domain-packs/medicine.json`

Medicine domain pack definition. Four callout types: Pearl, Warning, Mnemonic, Tip.
Versioned JSON with explicit `id`, `profession`, and per-callout `color`, `label`, `description`.

### 2. `apps/server/src/services/nuklius/domain_pack_loader.ts`

Synchronous JSON loader with:
- Schema validation (required fields, unique callout type IDs)
- In-process caching (one disk read per process lifetime)
- `NUKLIUS_DOMAIN_PACK` env var override for custom pack paths
- Hardcoded medicine defaults as fallback — app never fails to start due to missing pack
- Exports: `getDomainPack()`, `getEditorCallouts()`, `resetCache()` (tests only)

### 3. Route and template injection

`apps/server/src/routes/index.ts`: injects `nukliusCallouts` from loader into template render context (guarded try/catch).

`apps/server/src/assets/views/partials/windowGlobal.ejs`: serializes callout list to `window.glob.nukliusDomainPack`.

### 4. `packages/ckeditor5/src/plugins/nuklius/medical_callout.ts`

`MedicalCalloutPlugin` (CKEditor 5 Plugin) with:
- `MedicalCalloutEditing` subplugin: schema registration, upcast/downcast converters, `InsertCalloutCommand`
- `MedicalCalloutUI` subplugin: `nukliusCallout` dropdown, per-type button components
- Model element: `nukliusCallout[type]` → `<div class="nuklius-callout nuklius-callout--{type}">`
- Type resolution: reads `window.glob.nukliusDomainPack` at init, falls back to built-in medicine defaults

### 5. `apps/client/src/stylesheets/nuklius-callouts.css`

Four callout type styles (pearl/teal, warning/amber, mnemonic/violet, tip/green). Left border accent + background tint + `::before` label badge. Supports both `.ck-content` (editor) and bare class (read-only). Dark theme via `.theme-dark` class and `@media (prefers-color-scheme: dark)`.

### 6. Plugin and toolbar wiring

- `packages/ckeditor5/src/plugins.ts`: adds `MedicalCalloutPlugin` to `TRILIUM_PLUGINS`
- `packages/ckeditor5/src/index.ts`: extends `EditorConfig` with `medicalCallout?` type
- `apps/client/src/widgets/type_widgets/ckeditor/config.ts`: adds `"nukliusCallout"` to classic toolbar and floating block toolbar
- `apps/client/src/types.d.ts`: types `window.glob.nukliusDomainPack`
- `apps/client/src/stylesheets/style.css`: `@import "./nuklius-callouts.css"`

---

## Tests

| File | Tests | Status |
|------|-------|--------|
| `apps/server/src/services/nuklius/domain_pack_loader.spec.ts` | 8 | PASSING |
| `packages/ckeditor5/src/plugins/nuklius/medical_callout.spec.ts` | 10 | PASSING |
| `apps/client/src/widgets/type_widgets/ckeditor/config.spec.ts` | +2 new tests | FAILING (pre-existing env issue) |
| Server test suite (857 existing) | 857 | PASSING |

**Note on client test failures:** `config.spec.ts` and other client specs were already failing before Sprint 2 (confirmed via `git stash` baseline). The failures are caused by bootstrap/WebSocket module side effects in the jsdom test environment — a pre-existing Sprint 1 issue. The two new toolbar presence assertions were added; they will pass once the client test env is fixed.

**Note on browser-level plugin tests:** Full CKEditor upcast/downcast roundtrip tests require Chrome + WebDriverIO. Deferred to Sprint 3 test infrastructure milestone.

---

## Architectural Decisions

### ADR-012: Domain Pack JSON as the callout source of truth

**Context:** Callout types (Pearl, Warning, Mnemonic, Tip) could be hardcoded in the plugin or in a database, or loaded from a config file.

**Decision:** JSON file in `apps/server/domain-packs/`. Path configurable via env var. Hardcoded defaults as fallback.

**Rationale:** File-based config is the lightest extensibility mechanism — no database schema, no API, no migration. Swapping a JSON file to change a profession requires no code changes, which satisfies the R-DOMAIN-GENERALIZATION risk mitigation.

**Consequence:** Config is read once at startup. Hot-reload requires a server restart. Acceptable for V1.

### ADR-013: Keep `@triliumnext/ckeditor5-admonition` alongside MedicalCalloutPlugin

**Context:** The tessera debate plan suggested removing the upstream admonition plugin when adding MedicalCalloutPlugin.

**Decision:** Both plugins coexist. Admonition uses `<aside class="admonition TYPE">`. Nuklius callouts use `<div class="nuklius-callout nuklius-callout--TYPE">`. The namespaces are orthogonal.

**Rationale:** Removing the upstream admonition plugin would break any existing Trilium notes that use admonition blocks. The Nuklius callout system is additive, not a replacement.

### ADR-014: Browser-level CKEditor plugin tests deferred to Sprint 3

**Context:** Proper CKEditor 5 plugin tests require Chrome + WebDriverIO (the pattern used by `@triliumnext/ckeditor5-admonition`).

**Decision:** Sprint 2 ships lightweight vitest/jsdom tests for plugin structure and type resolution. Browser roundtrip tests are flagged as a Sprint 3 task.

**Rationale:** Setting up WebDriverIO/Chrome in CI is a separate infrastructure task. Sprint 2 focus is the callout feature, not the test infrastructure.

---

## CI Evidence

First full CI run will occur on the Sprint 2 PR. Evidence table to be filled after CI passes.

| Job | Status | Run URL |
|-----|--------|---------|
| repro-build | PENDING | — |
| sast-semgrep | PENDING | — |
| sast-codeql | PENDING | — |
| secrets-scan | PENDING | — |
| dependency-audit | PENDING | — |

---

## Files Changed

### Created
- `apps/server/domain-packs/medicine.json`
- `apps/server/src/services/nuklius/domain_pack_loader.ts`
- `apps/server/src/services/nuklius/domain_pack_loader.spec.ts`
- `apps/client/src/stylesheets/nuklius-callouts.css`
- `apps/client/vitest.config.mts`
- `packages/ckeditor5/src/plugins/nuklius/medical_callout.ts`
- `packages/ckeditor5/src/plugins/nuklius/medical_callout.spec.ts`
- `packages/ckeditor5/vitest.config.ts`
- `docs/DOMAIN_PACKS.md`
- `docs/MEDICAL_CALLOUTS.md`
- `docs/SPRINT-02.md` (this file)

### Modified
- `apps/server/src/routes/index.ts`
- `apps/server/src/assets/views/partials/windowGlobal.ejs`
- `apps/client/src/types.d.ts`
- `apps/client/src/widgets/type_widgets/ckeditor/config.ts`
- `apps/client/src/widgets/type_widgets/ckeditor/config.spec.ts`
- `apps/client/src/stylesheets/style.css`
- `packages/ckeditor5/src/plugins.ts`
- `packages/ckeditor5/src/index.ts`

---

## Sprint 3 Ready-to-Run Prompt

```
You are executing Nuklius Sprint 3 from the approved sprint board at
nuklius-sprint-board-v2-professional.md (repo root).

Sprint 2 is complete. Sprint 3 objective: ship block addressing (^N) and block index.

Engineering tasks:
- packages/ckeditor5/src/plugins/nuklius/block_id.ts: stable block ID plugin
- apps/server: Nuklius_blocks table + rebuild utility
- apps/client: block marker UX
- import/export support for block metadata footer

Acceptance tests:
- ID stability across save/reload
- Rebuild consistency
- Import/export preserves addressability

Dependency tags: DEP-BLOCK, DEP-EDITOR
Risk flags: R-PERF, R-DATA-INTEGRITY
Estimate: 46 SP

Outstanding from Sprint 2:
- Client test environment (bootstrap/WebSocket jsdom side effects) needs a fix so
  config.spec.ts and other client specs pass — treat as a Sprint 3 prerequisite
- Browser-level CKEditor plugin tests (Chrome + WebDriverIO) infrastructure setup

Run /build with the Sprint 3 task.
Mandatory end-of-sprint: /mdd (docs/ARCHITECTURE.md, docs/MERGE_RULES.md, docs/SPRINT-03.md),
code/security review + auto-fix High/Critical, /handoff with Sprint 4 prompt.
```
