import {Given, expect} from "../baseTest" 
import "dotenv/config";

/**
 * @domain common steps
 * @description used to navigate to a path off of the currently set base URL
 * @prereq none
 * @uses page, baseURL
 */
Given("I navigate to path {string}", async({page, baseURL}, target: string) => {
    await page.goto(baseURL + target);
    await page.waitForLoadState("domcontentloaded"); 
    expect(page.url()).toContain(baseURL+target); 
});


