# CKEditor 5 Licensing Policy

Governs which CKEditor 5 features Nuklius uses and under which license conditions.
Updated when new CKEditor features are adopted or distribution plans change.

---

## License Matrix

| Component | License | Nuklius Usage | Distribution Policy |
|-----------|---------|--------------|---------------------|
| CKEditor 5 core (`@ckeditor/ckeditor5-*`) | GPL-2.0-or-later | Yes — all core plugins | Permitted (GPL-compatible with AGPL-3.0) |
| CKEditor 5 premium — slash commands | Commercial (CKEditor partnership) | **Personal use only** | MUST NOT be included in distributed builds |
| CKEditor 5 premium — text snippets | Commercial (CKEditor partnership) | **Personal use only** | MUST NOT be included in distributed builds |
| Nuklius custom plugins (`packages/ckeditor5/src/plugins/nuklius/`) | AGPL-3.0 | Yes | Permitted |

---

## Mandatory Policy

1. **Personal mode:** CKEditor premium slash commands and text snippets are permitted under
   Trilium's existing partnership arrangement.

2. **Distributed builds:** Premium features must be removed and replaced with the open
   slash command implementation built in Sprint 16 (`packages/ckeditor5/src/plugins/nuklius/open_slash.ts`).
   This is a **hard requirement** before any commercial packaging or public distribution.

3. **Feature flag:** Premium CKEditor features must be gated behind `NUKLIUS_PERSONAL_MODE=true`
   so that the distribution build can disable them with a single environment flag.

4. **Legal review:** A legal review checkpoint is required before any commercial packaging.
   Document the outcome in this file.

---

## Sprint 16 Action Item

Build the open slash command implementation:
- File: `packages/ckeditor5/src/plugins/nuklius/open_slash.ts`
- Commands: `/ask`, `/explain`, `/differential`, `/pearl`, `/warning`, `/mnemonic`, `/tip`
- Acceptance: all distribution smoke tests pass without CKEditor premium dependency

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-18 | Sprint 1: Initial policy documented (ADR-009) |
| Sprint 16 | (placeholder) Open slash command implementation complete |
