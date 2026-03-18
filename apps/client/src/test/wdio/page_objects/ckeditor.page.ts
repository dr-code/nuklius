/**
 * Page object for CKEditor in the Trilium/Nuklius editable-text widget.
 * Wraps common interactions needed by browser-level E2E tests.
 */
export class CKEditorPage {
    /**
     * Waits for and returns the editable CKEditor content area.
     */
    async getEditableArea() {
        const area = await $(".ck-editor__editable");
        await area.waitForDisplayed({ timeout: 10000 });
        return area;
    }

    /**
     * Returns all block elements that have a nuklius block ID attribute.
     */
    async getAddressedBlocks(): Promise<WebdriverIO.ElementArray> {
        return $$("[data-nuklius-block-id]");
    }

    /**
     * Returns the block ID for a given block element index (0-based).
     */
    async getBlockId(index: number): Promise<string | null> {
        const blocks = await this.getAddressedBlocks();
        if (index >= blocks.length) return null;
        return blocks[index].getAttribute("data-nuklius-block-id");
    }

    /**
     * Waits until at least minCount addressed blocks are present in the DOM.
     */
    async waitForAddressedBlocks(minCount: number, timeout = 8000): Promise<void> {
        await browser.waitUntil(
            async () => (await this.getAddressedBlocks()).length >= minCount,
            { timeout, interval: 200, timeoutMsg: `Expected at least ${minCount} addressed blocks` }
        );
    }
}

export default new CKEditorPage();
