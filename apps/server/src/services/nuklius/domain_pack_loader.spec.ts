import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";

// Reset module cache between tests so each test gets a fresh loader state.
beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
});

async function loadFresh() {
    const mod = await import("./domain_pack_loader.js");
    mod.resetCache();
    return mod;
}

const VALID_PACK = {
    id: "medicine",
    name: "Medicine",
    version: "1.0.0",
    profession: "medicine",
    callouts: [
        { type: "pearl",    label: "Pearl",    color: "#0d9488", description: "A" },
        { type: "warning",  label: "Warning",  color: "#d97706", description: "B" },
        { type: "mnemonic", label: "Mnemonic", color: "#7c3aed", description: "C" },
        { type: "tip",      label: "Tip",      color: "#16a34a", description: "D" }
    ]
};

describe("domain_pack_loader", () => {
    describe("getDomainPack", () => {
        it("loads and returns a valid medicine pack from file", async () => {
            vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(VALID_PACK));
            const { getDomainPack } = await loadFresh();
            const pack = getDomainPack();
            expect(pack.id).toBe("medicine");
            expect(pack.callouts).toHaveLength(4);
            expect(pack.callouts.map(c => c.type)).toEqual(["pearl", "warning", "mnemonic", "tip"]);
        });

        it("falls back to medicine defaults when file is not found", async () => {
            vi.spyOn(fs, "readFileSync").mockImplementation(() => {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            });
            const { getDomainPack } = await loadFresh();
            const pack = getDomainPack();
            expect(pack.id).toBe("medicine");
            expect(pack.callouts).toHaveLength(4);
        });

        it("falls back to defaults when JSON is invalid", async () => {
            vi.spyOn(fs, "readFileSync").mockReturnValue("not json {{{");
            const { getDomainPack } = await loadFresh();
            const pack = getDomainPack();
            expect(pack.id).toBe("medicine");
        });

        it("falls back to defaults when pack has missing required fields", async () => {
            const invalid = { id: "", callouts: [] };
            vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(invalid));
            const { getDomainPack } = await loadFresh();
            const pack = getDomainPack();
            expect(pack.id).toBe("medicine");
        });

        it("falls back to defaults when a callout type contains invalid characters", async () => {
            const badTypePack = {
                ...VALID_PACK,
                callouts: [
                    { type: "pearl with spaces", label: "Pearl", color: "#000", description: "A" }
                ]
            };
            vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(badTypePack));
            const { getDomainPack } = await loadFresh();
            const pack = getDomainPack();
            expect(pack.id).toBe("medicine");
        });

        it("returns a defensive copy — mutating the result does not affect the cache", async () => {
            vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(VALID_PACK));
            const { getDomainPack } = await loadFresh();
            const pack1 = getDomainPack();
            pack1.callouts[0].label = "MUTATED";
            const pack2 = getDomainPack();
            expect(pack2.callouts[0].label).toBe("Pearl");
        });

        it("falls back to defaults when callout ids are not unique", async () => {
            const dupePack = {
                ...VALID_PACK,
                callouts: [
                    { type: "pearl", label: "Pearl", color: "#000", description: "A" },
                    { type: "pearl", label: "Pearl 2", color: "#111", description: "B" }
                ]
            };
            vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(dupePack));
            const { getDomainPack } = await loadFresh();
            const pack = getDomainPack();
            expect(pack.id).toBe("medicine");
        });

        it("caches the result on repeated calls", async () => {
            const spy = vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(VALID_PACK));
            const { getDomainPack } = await loadFresh();
            getDomainPack();
            getDomainPack();
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("getEditorCallouts", () => {
        it("returns the four medicine callout types", async () => {
            vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(VALID_PACK));
            const { getEditorCallouts } = await loadFresh();
            const callouts = getEditorCallouts();
            expect(callouts.map(c => c.type)).toEqual(["pearl", "warning", "mnemonic", "tip"]);
            expect(callouts.every(c => typeof c.label === "string")).toBe(true);
            expect(callouts.every(c => typeof c.color === "string")).toBe(true);
        });
    });

    describe("NUKLIUS_DOMAIN_PACK env override", () => {
        afterEach(() => {
            delete process.env.NUKLIUS_DOMAIN_PACK;
        });

        it("reads from env-specified path when set", async () => {
            const customPath = "/custom/pack.json";
            process.env.NUKLIUS_DOMAIN_PACK = customPath;
            const spy = vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(VALID_PACK));
            const { getDomainPack } = await loadFresh();
            getDomainPack();
            expect(spy).toHaveBeenCalledWith(customPath, "utf-8");
        });
    });
});
