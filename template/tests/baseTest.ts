import { test as base, createBdd } from "playwright-bdd";

/*
 * I learned BDD in Cucumber ,so I'm used to having a world for scenario scoped variables , I usually
 * create this type to sim it using a playwright fixture. You can add any scenario scoped variables here and use them across steps
 */
type World = {
  baseUrl: string;
  // Auth credentials sourced from the environment (.env / CI secrets) so steps
  // can sign in without hardcoding secrets in .feature files. See the env docs.
  creds: { user: string; pass: string };
};

// // add your custom fixtures, types , etc into the fixture type , then you will be able to customize and extend them below in the test config
type Fixtures = {
  world: World; // scenario-scoped global vars
};

// customize the test config to initalize and use the custom fixtures
export const test = base.extend<Fixtures>({
  // Playwright requires the first arg to be an object pattern; this fixture needs no other fixtures.
  // eslint-disable-next-line no-empty-pattern
  world: async ({}, use) => {
    await use({
      baseUrl: "",
      creds: {
        user: process.env.STANDARD_USER ?? "",
        pass: process.env.STANDARD_PASS ?? "",
      },
    });
  },
});

export { expect } from "@playwright/test";
export const { Given, When, Then } = createBdd(test);
