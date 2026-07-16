import {Given, expect} from "../baseTest" 
import "dotenv/config";

Given("I navigate to path {string}", async({page, baseURL}, target: string) => {
    await page.goto(baseURL + target);
    await page.waitForLoadState("domcontentloaded"); 
    expect(page.url()).toContain(baseURL+target); 
});