import type { Page } from "@playwright/test";

/**
 * @description shared behaviour for every page; extend it for each screen of the app
 */
export class BasePage {
  constructor(readonly page: Page) {}

  /** navigate to a path relative to the configured baseURL, and wait for the DOM */
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }
}
