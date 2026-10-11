import { Given, expect } from "../baseTest";
import { BasePage } from "../pages/BasePage";
import "dotenv/config";

/**
 * @domain common steps
 * @description used to navigate to a path off of the currently set base URL
 * @prereq none
 * @uses page, baseURL
 */
Given("I navigate to path {string}", async ({ page, baseURL }, target: string) => {
  await new BasePage(page).goto(baseURL + target);
  expect(page.url()).toContain(baseURL + target);
});
