import fs from "fs";
import path from "path";


export interface CalloutDef {
    type: string;
    label: string;
    color: string;
    description: string;
}

export interface DomainPack {
    id: string;
    name: string;
    version: string;
    profession: string;
    callouts: CalloutDef[];
}

// ^[a-z0-9-]+$ — safe for CSS modifier classes and toolbar component keys.
const CALLOUT_TYPE_RE = /^[a-z0-9-]+$/;

const MEDICINE_DEFAULTS: Readonly<DomainPack> = Object.freeze({
    id: "medicine",
    name: "Medicine",
    version: "1.0.0",
    profession: "medicine",
    callouts: Object.freeze([
        Object.freeze({ type: "pearl",    label: "Pearl",    color: "#0d9488", description: "High-yield clinical insight or exam tip" }),
        Object.freeze({ type: "warning",  label: "Warning",  color: "#d97706", description: "Hazard, contraindication, or safety alert" }),
        Object.freeze({ type: "mnemonic", label: "Mnemonic", color: "#7c3aed", description: "Memory aid or recall device" }),
        Object.freeze({ type: "tip",      label: "Tip",      color: "#16a34a", description: "Practical bedside or workflow tip" })
    ]) as unknown as CalloutDef[]
});

let cachedPack: DomainPack | null = null;

function isValidCalloutDef(obj: unknown): obj is CalloutDef {
    if (typeof obj !== "object" || obj === null) return false;
    const c = obj as Record<string, unknown>;
    return (
        typeof c.type === "string" && CALLOUT_TYPE_RE.test(c.type) &&
        typeof c.label === "string" && c.label.trim().length > 0 &&
        typeof c.color === "string" &&
        typeof c.description === "string"
    );
}

function isValidDomainPack(obj: unknown): obj is DomainPack {
    if (typeof obj !== "object" || obj === null) return false;
    const p = obj as Record<string, unknown>;
    if (
        typeof p.id !== "string" || p.id.length === 0 ||
        typeof p.name !== "string" ||
        typeof p.version !== "string" ||
        typeof p.profession !== "string" ||
        !Array.isArray(p.callouts) || p.callouts.length === 0
    ) {
        return false;
    }
    if (!p.callouts.every(isValidCalloutDef)) return false;
    const ids = (p.callouts as CalloutDef[]).map(c => c.type);
    return ids.length === new Set(ids).size;
}

function resolvePackPath(): string {
    const envPath = process.env.NUKLIUS_DOMAIN_PACK;
    if (envPath) return envPath;
    // __dirname = apps/server/src/services/nuklius (dev) or apps/server/dist/services/nuklius (prod)
    // ../../../domain-packs resolves to apps/server/domain-packs in both layouts.
    return path.resolve(__dirname, "../../../domain-packs/medicine.json");
}

function clonePack(pack: DomainPack): DomainPack {
    return {
        ...pack,
        callouts: pack.callouts.map(c => ({ ...c }))
    };
}

export function getDomainPack(): DomainPack {
    if (cachedPack) return clonePack(cachedPack);

    const packPath = resolvePackPath();
    try {
        const raw = fs.readFileSync(packPath, "utf-8");
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch (parseErr) {
            console.error(`Domain pack JSON parse error at ${packPath}: ${parseErr}`);
            cachedPack = MEDICINE_DEFAULTS as DomainPack;
            return clonePack(cachedPack);
        }

        if (!isValidDomainPack(parsed)) {
            console.error(`Domain pack schema validation failed for ${packPath} — using medicine defaults`);
            cachedPack = MEDICINE_DEFAULTS as DomainPack;
            return clonePack(cachedPack);
        }

        cachedPack = parsed;
        return clonePack(cachedPack);
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
            console.error(`Domain pack load error at ${packPath}: ${err}`);
        }
        cachedPack = MEDICINE_DEFAULTS as DomainPack;
        return clonePack(cachedPack);
    }
}

export function getEditorCallouts(): CalloutDef[] {
    return getDomainPack().callouts;
}

export function resetCache(): void {
    cachedPack = null;
}
