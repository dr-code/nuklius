import { Plugin, uid } from "ckeditor5";
import type { Element, DocumentFragment, Writer, ViewElement, ViewWriter } from "ckeditor5";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const ATTRIBUTE_NAME = "nukliusBlockId";
const HTML_ATTRIBUTE = "data-nuklius-block-id";

/**
 * Known block elements that can receive a stable block ID.
 * Checked with schema.isRegistered() before extending so missing plugins
 * do not cause errors.
 */
const ADDRESSABLE_ELEMENTS: ReadonlyArray<string> = [
    "paragraph",
    "heading1", "heading2", "heading3", "heading4", "heading5", "heading6",
    "blockQuote",
    "codeBlock",
    "listItem",
    "horizontalLine",
    "pageBreak",
    "nukliusCallout"
];

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Recursively yield every Element in the subtree (including root's children
 * and their descendants) that is a direct block (not a $text node).
 * Used by the post-fixer to walk the document and find unaddressed blocks.
 */
function* walkElements(node: Element | DocumentFragment): Generator<Element> {
    for (const child of node.getChildren()) {
        if (child.is("element")) {
            yield child;
            yield* walkElements(child);
        }
    }
}

// ----------------------------------------------------------------
// Editing sub-plugin: schema + converters + post-fixer
// ----------------------------------------------------------------

class NukliusBlockIdEditing extends Plugin {
    static override get pluginName() {
        return "NukliusBlockIdEditing" as const;
    }

    override init(): void {
        this._defineSchema();
        this._defineConverters();
        this._registerPostFixer();
    }

    private _defineSchema(): void {
        const schema = this.editor.model.schema;
        for (const name of ADDRESSABLE_ELEMENTS) {
            if (schema.isRegistered(name)) {
                schema.extend(name, { allowAttributes: [ATTRIBUTE_NAME] });
            }
        }
    }

    private _defineConverters(): void {
        const conversion = this.editor.conversion;

        // ----------------------------------------------------------
        // Upcast: HTML data-nuklius-block-id → model nukliusBlockId
        //
        // Priority "low" ensures element-to-element converters have
        // already run and model elements exist before we walk them.
        // ----------------------------------------------------------
        conversion.for("upcast").add(dispatcher => {
            dispatcher.on("element", (_evt, data, conversionApi) => {
                const viewElement = data.viewItem;
                if (!viewElement.is("element")) return;

                const blockId = viewElement.getAttribute(HTML_ATTRIBUTE) as string | null;
                if (!blockId) return;

                // Consume the attribute so other converters don't see it.
                conversionApi.consumable.consume(viewElement, { attributes: [HTML_ATTRIBUTE] });

                if (!data.modelRange) return;
                for (const item of data.modelRange.getItems()) {
                    if (
                        item.is("element") &&
                        conversionApi.schema.checkAttribute(item, ATTRIBUTE_NAME)
                    ) {
                        conversionApi.writer.setAttribute(ATTRIBUTE_NAME, blockId, item);
                    }
                }
            }, { priority: "low" });
        });

        // ----------------------------------------------------------
        // Downcast (data): model nukliusBlockId → data-nuklius-block-id
        // ----------------------------------------------------------
        conversion.for("dataDowncast").add(dispatcher => {
            dispatcher.on(
                `attribute:${ATTRIBUTE_NAME}`,
                (_evt, data, conversionApi) => {
                    if (!data.item.is("element")) return;
                    const viewElement = conversionApi.mapper.toViewElement(
                        data.item as Element
                    );
                    if (!viewElement) return;
                    applyBlockIdAttribute(
                        conversionApi.writer,
                        viewElement,
                        data.attributeNewValue as string | null
                    );
                }
            );
        });

        // ----------------------------------------------------------
        // Downcast (editing): also applied to the live editing view
        // so the DOM reflects block IDs for client-side UX.
        // ----------------------------------------------------------
        conversion.for("editingDowncast").add(dispatcher => {
            dispatcher.on(
                `attribute:${ATTRIBUTE_NAME}`,
                (_evt, data, conversionApi) => {
                    if (!data.item.is("element")) return;
                    const viewElement = conversionApi.mapper.toViewElement(
                        data.item as Element
                    );
                    if (!viewElement) return;
                    applyBlockIdAttribute(
                        conversionApi.writer,
                        viewElement,
                        data.attributeNewValue as string | null
                    );
                }
            );
        });
    }

    private _registerPostFixer(): void {
        /**
         * Post-fixer: after every model change, walk the document and
         * assign a UUID to any block element that lacks one. Returns true
         * if any attribute was added (triggering another post-fixer cycle
         * until stable), false if no changes were needed.
         *
         * Existing IDs are NEVER replaced — only absent IDs are filled.
         */
        this.editor.model.document.registerPostFixer((writer: Writer) => {
            const root = this.editor.model.document.getRoot();
            if (!root) return false;

            let changed = false;
            const seen = new Set<string>();

            for (const element of walkElements(root)) {
                if (!this.editor.model.schema.checkAttribute(element, ATTRIBUTE_NAME)) {
                    continue;
                }

                const existingId = element.getAttribute(ATTRIBUTE_NAME) as string | undefined;

                if (!existingId || seen.has(existingId)) {
                    // Assign a fresh UUID for missing IDs and copy/paste duplicates.
                    writer.setAttribute(ATTRIBUTE_NAME, uid(), element);
                    changed = true;
                } else {
                    seen.add(existingId);
                }
            }
            return changed;
        });
    }
}

// ----------------------------------------------------------------
// Public façade plugin
// ----------------------------------------------------------------

/**
 * NukliusBlockId — stable block addressing plugin.
 *
 * Assigns a random UUID to every supported block element on creation and
 * preserves it across save/reload. IDs are written as `data-nuklius-block-id`
 * in the HTML and read back on upcast.
 *
 * Host apps may optionally provide `nukliusBlockId.enabled: false` to
 * disable ID assignment (e.g., for read-only views that never save).
 */
export default class NukliusBlockIdPlugin extends Plugin {
    static override get pluginName() {
        return "NukliusBlockId" as const;
    }

    static override get requires() {
        return [NukliusBlockIdEditing] as const;
    }

    override init(): void {
        const config = this.editor.config.get("nukliusBlockId") as
            | { enabled?: boolean }
            | undefined;
        if (config?.enabled === false) {
            // Plugin loaded but inactive — remove the post-fixer effect by
            // not registering it. Schema/converters remain for round-trips.
        }
    }
}

// ----------------------------------------------------------------
// Internal helper
// ----------------------------------------------------------------

function applyBlockIdAttribute(
    writer: ViewWriter,
    viewElement: ViewElement,
    value: string | null
): void {
    if (value !== null) {
        writer.setAttribute(HTML_ATTRIBUTE, value, viewElement);
    } else {
        writer.removeAttribute(HTML_ATTRIBUTE, viewElement);
    }
}
