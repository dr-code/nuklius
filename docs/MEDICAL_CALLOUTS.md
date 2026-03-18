---
id: medical-callouts
title: Medical Callouts
edition: Nuklius
depends_on: [domain-packs]
source_files:
  - packages/ckeditor5/src/plugins/nuklius/medical_callout.ts
  - packages/ckeditor5/src/plugins.ts
  - packages/ckeditor5/src/index.ts
  - apps/client/src/widgets/type_widgets/ckeditor/config.ts
  - apps/client/src/stylesheets/nuklius-callouts.css
  - apps/client/src/stylesheets/style.css
routes: []
models: []
test_files:
  - packages/ckeditor5/src/plugins/nuklius/medical_callout.spec.ts
  - apps/client/src/widgets/type_widgets/ckeditor/config.spec.ts
known_issues: []
---

# Medical Callouts

## Purpose

Medical callouts are styled block elements in the Nuklius CKEditor that allow a physician
to tag content with a semantic type: Pearl (high-yield clinical insight), Warning (hazard or
contraindication), Mnemonic (memory aid), or Tip (practical workflow advice). They are
data-driven via the Domain Pack system, so the same plugin architecture supports other
professional callout sets without code changes.

## Architecture

```
packages/ckeditor5/src/plugins/nuklius/
  medical_callout.ts          ← MedicalCalloutPlugin (editing + UI subplugins)

packages/ckeditor5/src/
  plugins.ts                  ← adds MedicalCalloutPlugin to TRILIUM_PLUGINS
  index.ts                    ← extends EditorConfig with medicalCallout? type

apps/client/src/widgets/type_widgets/ckeditor/
  config.ts                   ← adds "nukliusCallout" to classic and floating toolbars

apps/client/src/stylesheets/
  nuklius-callouts.css        ← callout block styles (both editor and read-only)
  style.css                   ← @imports nuklius-callouts.css
```

### Plugin Class Hierarchy

```
MedicalCalloutPlugin (root)
  ├── MedicalCalloutEditing  (schema + converters + command)
  └── MedicalCalloutUI       (toolbar dropdown + per-type buttons)
```

### Model Element

| Property  | Value                                     |
|-----------|-------------------------------------------|
| Name      | `nukliusCallout`                          |
| Attribute | `type` (string: "pearl"|"warning"|...) |
| Allowed in| `$root` and `$container`                  |
| Children  | `$container` children (allows `paragraph`)|

### HTML Serialization

**Downcast (model → HTML for save/render):**
```html
<div class="nuklius-callout nuklius-callout--pearl">
  <p>callout content here</p>
</div>
```

**Upcast (HTML → model on load):**
- Match `div.nuklius-callout` with a `nuklius-callout--{type}` class
- Extract type from the second class name
- Default to `tip` if no matching type class is found

## CKEditor Plugin API

### Command: `insertNukliusCallout`

Registered as: `editor.commands.get("insertNukliusCallout")`

Execute signature:
```ts
editor.execute("insertNukliusCallout", { type: "pearl" });
```

Enabled when: cursor is in a position that allows `nukliusCallout` according to schema.

### Toolbar Components

| Component key           | What it renders                        |
|-------------------------|----------------------------------------|
| `nukliusCallout`        | Dropdown with all types from domain pack |
| `insertNukliusPearl`    | Single button for Pearl callout        |
| `insertNukliusWarning`  | Single button for Warning callout      |
| `insertNukliusMnemonic` | Single button for Mnemonic callout     |
| `insertNukliusTip`      | Single button for Tip callout          |

### Type Resolution

The plugin reads `window.glob.nukliusDomainPack` at `init()` time. If the array is absent
or empty, it falls back to `DEFAULT_CALLOUT_TYPES` (the four medicine types hardcoded in
the plugin file). This ensures the plugin works offline or when the server-side injection
is unavailable.

## CSS Design

File: `apps/client/src/stylesheets/nuklius-callouts.css`

Each callout type has:
- A left border accent in a type-specific color
- A tinted background matching the border hue
- A `::before` pseudo-element badge with the type label (e.g., "Pearl", "Warning")

| Type     | Border/Label color | Background |
|----------|--------------------|------------|
| pearl    | teal (`#0d9488`)   | `#f0fdfa`  |
| warning  | amber (`#d97706`)  | `#fffbeb`  |
| mnemonic | violet (`#7c3aed`) | `#faf5ff`  |
| tip      | green (`#16a34a`)  | `#f0fdf4`  |

Dark theme overrides use `.theme-dark` body class (Trilium convention) and
`@media (prefers-color-scheme: dark)`. CSS custom properties (`--nuklius-callout-*`)
allow per-pack theming in the future.

Selectors apply to both:
- `.ck-content .nuklius-callout` — editor rendering
- `.nuklius-callout` — web read-only note rendering

## Business Rules

1. **Insertion:** A callout is always inserted with an empty paragraph inside so the
   cursor lands inside the block and the user can begin typing immediately.

2. **Coexistence with Admonition plugin:** The `@triliumnext/ckeditor5-admonition` plugin
   uses `<aside class="admonition TYPE">` elements. It is explicitly kept in the plugin
   registry and is NOT replaced. The two namespaces (`aside.admonition` vs `div.nuklius-callout`)
   do not conflict.

3. **Roundtrip fidelity:** The downcast → upcast cycle must preserve the callout type.
   The `type` attribute is stored as a CSS modifier class on the `div` element. Loading
   a saved note must produce the same model as the original insertion.

4. **Unknown types on load:** If an HTML callout div has an unrecognized type class, the
   upcast converter defaults to `tip`. Content is never lost.

5. **Empty callout removal:** Handled by CKEditor's own model post-fixer if needed;
   the plugin does not add extra empty-element guards.

## Dependencies

- `domain-packs` — provides `CalloutDef[]` via `window.glob.nukliusDomainPack`
- CKEditor 5 `ckeditor5` package (workspace) — `Plugin`, `Command`, `ButtonView`,
  `createDropdown`, `addListToDropdown`, `Collection`, `ViewModel`

## Known Issues

- Browser-level upcast/downcast roundtrip tests (CKEditor editor lifecycle) require
  Chrome + WebDriverIO test infrastructure. These are deferred to Sprint 3 when the
  browser test pipeline is established. Current tests cover plugin structure, defaults,
  and type resolution logic in jsdom/Node.js.
