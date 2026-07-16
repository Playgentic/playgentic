
import { test as base, createBdd } from "playwright-bdd";

/*
 * I learned BDD in Cucumber ,so I'm used to having a world for scenario scoped variables , I usually
 * create this type to sim it using a playwright fixture. You can add any scenario scoped variables here and use them across steps
 */
type World = {
  baseUrl: string; 
}

// // add your custom fixtures, types , etc into the fixture type , then you will be able to customize and extend them below in the test config
type Fixtures = {
  world: World; // scenario-scoped global vars
};

// customize the test config to initalize and use the custom fixtures
export const test = base.extend<Fixtures>({
   world: async ({ page, context }, use) => {
     await use({
       baseUrl: "",
     });
    }
});

export { expect } from "@playwright/test";
export const { Given, When, Then } = createBdd(test);