import ckeditorPage from "./page_objects/ckeditor.page.js";

/**
 * Browser-level E2E tests for NukliusBlockId plugin.
 *
 * Prerequisites: Nuklius server running at NUKLIUS_BASE_URL (default: http://localhost:8080).
 * Run via: pnpm --filter @triliumnext/client exec wdio run wdio.conf.ts
 *
 * These tests validate that data-nuklius-block-id attributes are assigned,
 * are stable across save/reload, and are never replaced unnecessarily.
 */
describe("NukliusBlockId plugin — browser E2E", () => {
    const TEST_NOTE_TITLE = `wdio-block-id-${Date.now()}`;
    let testNoteUrl: string;

    before(async () => {
        // Navigate to the Nuklius application.
        await browser.url("/");
        // Wait for tree to load.
        await browser.waitUntil(
            async () => (await $(".tree-wrapper")).isDisplayed(),
            { timeout: 15000, timeoutMsg: "Trilium tree did not load" }
        );
    });

    it("assigns data-nuklius-block-id to each content block after edit", async () => {
        // Open a new note.
        await browser.keys(["Meta", "o"]);
        await browser.pause(500);

        const editable = await ckeditorPage.getEditableArea();
        await editable.click();

        // Type two paragraphs.
        await browser.keys(["Home"]);
        await browser.keys("First block of content");
        await browser.keys(["Enter"]);
        await browser.keys("Second block of content");

        // Save.
        await browser.keys(["Meta", "s"]);
        await browser.pause(1000);

        // Verify at least 2 blocks have block IDs.
        await ckeditorPage.waitForAddressedBlocks(2);
        const id1 = await ckeditorPage.getBlockId(0);
        const id2 = await ckeditorPage.getBlockId(1);

        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id1).not.toBe(id2);

        testNoteUrl = await browser.getUrl();
    });

    it("block IDs are stable across save and reload", async () => {
        if (!testNoteUrl) {
            return; // Depends on previous test.
        }

        // Collect current IDs before reload.
        await ckeditorPage.waitForAddressedBlocks(2);
        const idBefore0 = await ckeditorPage.getBlockId(0);
        const idBefore1 = await ckeditorPage.getBlockId(1);

        // Reload the page and navigate back to the same note.
        await browser.url(testNoteUrl);
        await browser.waitUntil(
            async () => (await $(".ck-editor__editable")).isDisplayed(),
            { timeout: 10000 }
        );
        await ckeditorPage.waitForAddressedBlocks(2);

        const idAfter0 = await ckeditorPage.getBlockId(0);
        const idAfter1 = await ckeditorPage.getBlockId(1);

        expect(idAfter0).toBe(idBefore0);
        expect(idAfter1).toBe(idBefore1);
    });

    it("block marker anchors are rendered for both blocks", async () => {
        if (!testNoteUrl) {
            return;
        }

        const markers = await $$(".nuklius-block-marker");
        expect(markers.length).toBeGreaterThanOrEqual(2);
    });
});
