import { describe, expect, it } from "vitest";
import { buildClassicToolbar, buildFloatingToolbar } from "./config.js";

type ToolbarConfig = string | "|" | { items: ToolbarConfig[] };

describe("CKEditor config", () => {
    it("has same toolbar items for fixed and floating", () => {
        function traverseItems(config: ToolbarConfig): string[] {
            const result: (string | string[])[] = [];
            if (typeof config === "object") {
                for (const item of config.items) {
                    result.push(traverseItems(item));
                }
            } else if (config !== "|") {
                result.push(config);
            }
            return result.flat();
        }

        const classicToolbarConfig = buildClassicToolbar(false);
        const classicToolbarItems = new Set(traverseItems(classicToolbarConfig.toolbar));

        const floatingToolbarConfig = buildFloatingToolbar();
        const floatingToolbarItems = traverseItems(floatingToolbarConfig.toolbar);
        const floatingBlockToolbarItems = traverseItems({ items: floatingToolbarConfig.blockToolbar });
        const floatingToolbarAllItems = new Set([ ...floatingToolbarItems, ...floatingBlockToolbarItems ]);

        expect([ ...classicToolbarItems ].toSorted())
            .toStrictEqual([...floatingToolbarAllItems ].toSorted());
    });

    it("classic toolbar includes nukliusCallout", () => {
        function allItems(items: ToolbarConfig[]): string[] {
            return items.flatMap(item => {
                if (typeof item === "object" && "items" in item) return allItems(item.items);
                if (item === "|") return [];
                return [item];
            });
        }
        const config = buildClassicToolbar(false);
        expect(allItems(config.toolbar.items as ToolbarConfig[])).toContain("nukliusCallout");
    });

    it("floating block toolbar includes nukliusCallout", () => {
        const config = buildFloatingToolbar();
        const blockItems: string[] = (config.blockToolbar as ToolbarConfig[]).flatMap(item => {
            if (typeof item === "object" && "items" in item) return item.items.filter((i): i is string => typeof i === "string");
            if (item === "|") return [];
            return [item as string];
        });
        expect(blockItems).toContain("nukliusCallout");
    });
});
