import { vi } from "vitest";
import $ from "jquery";

// Inject globals immediately at module-load time.
// Modules imported by test files may call $() or access window.glob at
// class-definition time (not just in functions), so this must happen before
// any test file's imports are resolved.
(window as any).$ = $;
(window as any).WebSocket = () => {};
(window as any).glob = {
    isMainWindow: true
};

// vi.mock is hoisted before module imports by vitest's static analysis.
// Keep them at the top level (never inside beforeAll/describe) so that
// modules calling ws.subscribeToMessages() at module-load time are intercepted.
vi.mock("../services/ws.js", () => ({
    default: {
        subscribeToMessages(_callback: (message: unknown) => void) {
            // No-op in jsdom — no WebSocket runtime available.
        }
    }
}));

vi.mock("../services/server.js", () => ({
    default: {
        async get(url: string) {
            if (url === "options") {
                return {};
            }
            if (url === "keyboard-actions") {
                return [];
            }
            if (url === "tree") {
                return {
                    branches: [],
                    notes: [],
                    attributes: []
                };
            }
        },
        async post(url: string, data: object) {
            if (url === "tree/load") {
                throw new Error(
                    `A module tried to load from the server the following notes: ${((data as any).noteIds || []).join(",")}\nThis is not supported, use Froca mocking instead and ensure the note exist in the mock.`
                );
            }
        }
    }
}));
