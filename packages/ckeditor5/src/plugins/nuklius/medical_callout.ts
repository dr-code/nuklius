import {
    Plugin,
    Command,
    ButtonView,
    createDropdown,
    addListToDropdown,
    Collection,
    ViewModel,
    type ListDropdownButtonDefinition
} from "ckeditor5";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface CalloutTypeDef {
    type: string;
    label: string;
    color: string;
    description: string;
}

const DEFAULT_CALLOUT_TYPES: CalloutTypeDef[] = [
    { type: "pearl",    label: "Pearl",    color: "#0d9488", description: "High-yield clinical insight" },
    { type: "warning",  label: "Warning",  color: "#d97706", description: "Hazard or safety alert" },
    { type: "mnemonic", label: "Mnemonic", color: "#7c3aed", description: "Memory aid" },
    { type: "tip",      label: "Tip",      color: "#16a34a", description: "Practical tip" }
];

// ------------------------------------------------------------
// Command
// ------------------------------------------------------------

export class InsertCalloutCommand extends Command {
    override execute(options: { type?: string } = {}): void {
        const type = options.type ?? "tip";
        const editor = this.editor;
        editor.model.change(writer => {
            const callout = writer.createElement("nukliusCallout", { type });
            // Insert a paragraph inside so the cursor has somewhere to go.
            const para = writer.createElement("paragraph");
            writer.append(para, callout);

            const insertPosition = editor.model.document.selection.getFirstPosition()!;
            editor.model.insertContent(callout, insertPosition);

            // Move cursor into the paragraph.
            writer.setSelection(para, "in");
        });
    }

    override refresh(): void {
        const model = this.editor.model;
        const selection = model.document.selection;
        const allowedIn = model.schema.findAllowedParent(
            selection.getFirstPosition()!,
            "nukliusCallout"
        );
        this.isEnabled = allowedIn !== null;
    }
}

// ------------------------------------------------------------
// Editing subplugin (schema + converters)
// ------------------------------------------------------------

class MedicalCalloutEditing extends Plugin {
    static get pluginName() {
        return "MedicalCalloutEditing" as const;
    }

    init(): void {
        const editor = this.editor;
        this._defineSchema();
        this._defineConverters();
        editor.commands.add("insertNukliusCallout", new InsertCalloutCommand(editor));
    }

    private _defineSchema(): void {
        const schema = this.editor.model.schema;

        schema.register("nukliusCallout", {
            inheritAllFrom: "$container",
            allowAttributes: ["type"],
            allowIn: "$root",
            isObject: false
        });
    }

    private _defineConverters(): void {
        const conversion = this.editor.conversion;

        // Downcast: model → HTML (for saving and rendering)
        conversion.for("dataDowncast").elementToElement({
            model: {
                name: "nukliusCallout",
                attributes: ["type"]
            },
            view: (modelElement, { writer }) => {
                const type = modelElement.getAttribute("type") as string ?? "tip";
                return writer.createContainerElement("div", {
                    class: `nuklius-callout nuklius-callout--${type}`
                });
            }
        });

        conversion.for("editingDowncast").elementToElement({
            model: {
                name: "nukliusCallout",
                attributes: ["type"]
            },
            view: (modelElement, { writer }) => {
                const type = modelElement.getAttribute("type") as string ?? "tip";
                const div = writer.createContainerElement("div", {
                    class: `nuklius-callout nuklius-callout--${type}`
                });
                return div;
            }
        });

        // Upcast: HTML → model (for loading saved content)
        conversion.for("upcast").elementToElement({
            view: {
                name: "div",
                classes: "nuklius-callout"
            },
            model: (viewElement, { writer }) => {
                // Extract type from the second class, e.g. nuklius-callout--warning → warning
                const typeClass = Array.from(viewElement.getClassNames())
                    .find(cls => cls.startsWith("nuklius-callout--"));
                const type = typeClass ? typeClass.replace("nuklius-callout--", "") : "tip";
                return writer.createElement("nukliusCallout", { type });
            }
        });
    }
}

// ------------------------------------------------------------
// UI subplugin (toolbar dropdown)
// ------------------------------------------------------------

class MedicalCalloutUI extends Plugin {
    static get pluginName() {
        return "MedicalCalloutUI" as const;
    }

    init(): void {
        const editor = this.editor;
        const calloutTypes = this._resolveCalloutTypes();

        editor.ui.componentFactory.add("nukliusCallout", locale => {
            const command = editor.commands.get("insertNukliusCallout")!;
            const dropdownView = createDropdown(locale);

            dropdownView.buttonView.set({
                label: "Callout",
                withText: true,
                tooltip: true
            });

            dropdownView.bind("isEnabled").to(command);

            const items = new Collection<ListDropdownButtonDefinition>();
            for (const def of calloutTypes) {
                items.add({
                    type: "button",
                    model: new ViewModel({
                        _calloutType: def.type,
                        label: def.label,
                        withText: true
                    })
                });
            }

            addListToDropdown(dropdownView, items);

            dropdownView.on("execute", evt => {
                const type = (evt.source as any)._calloutType as string;
                editor.execute("insertNukliusCallout", { type });
                editor.editing.view.focus();
            });

            return dropdownView;
        });

        // Also register individual buttons for each type (for programmatic use)
        for (const def of calloutTypes) {
            const componentKey = `insertNuklius${def.label}` as string;
            editor.ui.componentFactory.add(componentKey, locale => {
                const btn = new ButtonView(locale);
                btn.set({
                    label: def.label,
                    withText: true,
                    tooltip: `Insert ${def.label} callout`
                });
                const command = editor.commands.get("insertNukliusCallout")!;
                btn.bind("isEnabled").to(command);
                btn.on("execute", () => {
                    editor.execute("insertNukliusCallout", { type: def.type });
                    editor.editing.view.focus();
                });
                return btn;
            });
        }
    }

    private _resolveCalloutTypes(): CalloutTypeDef[] {
        // Read from window.glob.nukliusDomainPack if available (browser context).
        if (
            typeof globalThis !== "undefined" &&
            (globalThis as any).glob?.nukliusDomainPack?.length > 0
        ) {
            return (globalThis as any).glob.nukliusDomainPack as CalloutTypeDef[];
        }
        return DEFAULT_CALLOUT_TYPES;
    }
}

// ------------------------------------------------------------
// Main plugin (assembles editing + UI)
// ------------------------------------------------------------

export default class MedicalCalloutPlugin extends Plugin {
    static get pluginName() {
        return "MedicalCallout" as const;
    }

    static get requires() {
        return [MedicalCalloutEditing, MedicalCalloutUI] as const;
    }
}
