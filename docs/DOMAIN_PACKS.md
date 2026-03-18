---
id: domain-packs
title: Domain Packs
edition: Nuklius
depends_on: []
source_files:
  - apps/server/domain-packs/medicine.json
  - apps/server/src/services/nuklius/domain_pack_loader.ts
  - apps/server/src/routes/index.ts
  - apps/server/src/assets/views/partials/windowGlobal.ejs
  - apps/client/src/types.d.ts
routes: []
models: []
test_files:
  - apps/server/src/services/nuklius/domain_pack_loader.spec.ts
known_issues: []
---

# Domain Packs

## Purpose

Domain packs are JSON configuration files that define profession-specific content types
(e.g., medical callouts, legal annotations) for use in the Nuklius editor. They allow
the editor to be configured for different professional contexts without code changes —
changing a JSON file is sufficient. The medicine domain pack is the default and shipped
with the application.

## Architecture

```
apps/server/domain-packs/
  medicine.json              ← default pack; also serves as the JSON schema reference

apps/server/src/services/nuklius/
  domain_pack_loader.ts      ← loader, validator, cache, fallback defaults

apps/server/src/routes/
  index.ts                   ← injects getEditorCallouts() into template context

apps/server/src/assets/views/partials/
  windowGlobal.ejs           ← serializes callout list into window.glob.nukliusDomainPack

apps/client/src/
  types.d.ts                 ← types window.glob.nukliusDomainPack

packages/ckeditor5/src/plugins/nuklius/
  medical_callout.ts         ← reads window.glob.nukliusDomainPack at plugin init
```

Flow at startup:

```
server start → domain_pack_loader loads/validates JSON → route handler injects callouts
→ EJS template serializes to window.glob.nukliusDomainPack → CKEditor plugin reads at init
```

## Data Model

### Domain Pack JSON (`apps/server/domain-packs/medicine.json`)

| Field       | Type           | Required | Notes                            |
|-------------|----------------|----------|----------------------------------|
| id          | string         | yes      | Unique pack identifier           |
| name        | string         | yes      | Display name                     |
| version     | string         | yes      | Semver string                    |
| profession  | string         | yes      | e.g., "medicine", "law"          |
| callouts    | CalloutDef[]   | yes      | Min 1 element required           |

### CalloutDef

| Field       | Type   | Required | Notes                               |
|-------------|--------|----------|-------------------------------------|
| type        | string | yes      | Unique within pack; used as CSS key |
| label       | string | yes      | Display name shown in toolbar       |
| color       | string | yes      | Hex color for styling               |
| description | string | yes      | Tooltip/help text                   |

Validation rules enforced by the loader:
- All four required fields on every `CalloutDef`
- No duplicate `type` values within a pack
- Pack `id` must be non-empty
- At least one callout must be defined

## API Endpoints

Domain packs have no REST API endpoints in Sprint 2. The pack data is injected server-side
into `window.glob.nukliusDomainPack` and consumed by the CKEditor plugin at init time.

Future sprint may expose a `/api/nuklius/domain-pack` read-only endpoint for client-side
refresh without page reload.

## Business Rules

1. **Pack resolution order:**
   - Check `NUKLIUS_DOMAIN_PACK` env var for a custom file path
   - Fall back to `apps/server/domain-packs/medicine.json` relative to `__dirname`

2. **Validation failure fallback:** If the JSON file is missing, malformed, or fails
   schema validation, the loader falls back to hardcoded medicine defaults and logs
   silently. The app never fails to start due to a bad domain pack.

3. **Caching:** The pack is loaded and validated once per process lifecycle. Call
   `resetCache()` (exported for tests) to reload.

4. **Route resilience:** The `nukliusCallouts` injection in `routes/index.ts` is
   wrapped in a try/catch; if the loader throws unexpectedly, it returns `[]` so the
   page still renders.

5. **Extensibility:** To add a new profession, create a new JSON file at any path,
   set `NUKLIUS_DOMAIN_PACK` to that path, and restart the server. No code changes required.

## Dependencies

None. Domain packs are a foundation service with no upstream Nuklius dependencies.

## Future Work

- Sprint 5: domain-pack template bindings for hierarchy scaffolding
- Sprint 17: domain-pack mappings for generated workspace artifacts
- Sprint 20: DOMAIN_PACKS_ROADMAP.md for non-medical verticals

## Known Issues

None.
