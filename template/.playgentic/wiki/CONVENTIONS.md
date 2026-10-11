# Conventions

This file is yours. Record how this suite is written and what good tests look like here. `npm run wiki` never touches it. The playgentic agents read it before writing or reviewing anything, and it takes precedence over their built-in defaults.

It starts with the scaffold's defaults. Edit, delete or extend freely.

## Project layout

- Features: `tests/features/**/*.feature`
- Step definitions: `tests/steps/**/*.steps.ts`. Import `Given/When/Then/expect` from `tests/baseTest.ts`.
- Page objects: `tests/pages/**/*.ts`. Extend `BasePage`.
- The generated index of steps and page objects is `.playgentic/wiki/index.md`. Regenerate it with `npm run wiki` after adding or changing steps or page objects.

## Code style

- TypeScript, formatted by prettier and linted by eslint. Pre-commit runs both, plus `lint:steps` and `tsc`.
- <!-- naming, file organisation, import style, comment expectations... -->

## Steps

- Every step definition has a JSDoc block with all four tags. `npm run lint:steps` enforces it:
  - `@domain`: the grouping, which becomes a wiki page
  - `@description`: what the step does
  - `@prereq`: the state it expects, or `none`
  - `@uses`: the fixtures it uses, or `none`
- Reuse existing steps (see `.playgentic/wiki/steps/`) before writing new ones. Never add near-duplicates.
- Keep steps thin: interactions belong in page objects, assertions belong in `Then` steps.
- <!-- step wording style, parameter types, when a new domain is justified... -->

## Page objects

- One class per screen or component, extending `BasePage`.
- Expose locators as `readonly` properties and user actions as methods. Give each a one-line JSDoc so it shows up in the wiki.
- <!-- locator naming, component objects vs page objects, what never goes in a page object... -->

## Locators

- Prefer `getByRole`, `getByLabel` and `getByTestId` over CSS. Never use XPath.
- <!-- test id attribute name, conventions for dynamic lists... -->

## Test data and auth

- Scenario-scoped state goes on the `world` fixture.
- Credentials come from env (`STANDARD_USER`, `STANDARD_PASS`), never from feature files.
- <!-- how test data is created and cleaned up, seeded accounts, API setup helpers... -->

## UI testing expectations

- <!-- what a good UI scenario covers, e.g. happy path plus key error states; what to assert (visible text, URL, state), and what not to (pixel layout unless visual tests are intended) -->

## API testing expectations

- <!-- whether API tests live here, which client/fixture to use, contract and schema checks, auth, status and body assertions -->

## Tagging and running

- Device projects are `desktop` and `mobile`, and each one only runs scenarios tagged with its name. Every scenario needs `@desktop`, `@mobile`, or both; a scenario with neither never runs.
- Run everything with `npm test`. Run one scenario with `npx bddgen && npx playwright test --grep "<tag or title>"`, adding `--project desktop` for a quicker loop.
- `TARGET_URL` comes from `.env`.
- <!-- smoke/regression tag conventions, ticket tags... -->
