# Agentic Playwright-BDD Suite

A [playwright-bdd](https://github.com/vitalets/playwright-bdd) test suite scaffolded with
[playgentic](https://www.npmjs.com/package/playgentic). Optionally wired for the
[playgentic agents](https://github.com/playgentic/playgentic-agents), which write and heal tests for you
in Claude Code, GitHub Copilot or Codex.

## Setup

```bash
cp .env.example .env        # set TARGET_URL to the app under test (required)
npm install
npx playwright install      # browsers
npm test                    # runs the example scenario
```

Add the agent harness any time with `npx playgentic agents claude,copilot,codex` (any subset).

## Layout

```
tests/
  baseTest.ts               # BDD binding + the scenario-scoped `world` fixture
  features/*.feature        # Gherkin scenarios
  steps/*.steps.ts          # step definitions (each needs a docstring — see below)
  pages/*.ts                # page objects (extend BasePage)
scripts/                    # zero-dep tooling: wiki, step lint
.playgentic/wiki/           # suite wiki: your CONVENTIONS.md + extensions/, plus the generated index
playwright.config.ts        # device projects, reporters
AGENTS.md / CLAUDE.md       # suite conventions for coding agents (with --agents)
.playgentic/config.json     # agent pipeline config (with --agents)
```

## Core config & how to extend

| File                                     | What it controls                                                               | Extend by                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`                   | device projects, reporters, `baseURL`                                          | add to the `targets` array (name + any Playwright `device`) to test more viewports; tune `timeout`/`retries`/`trace` in `use` |
| `tests/baseTest.ts`                      | the BDD `Given/When/Then` binding + the `world` fixture (scenario-scoped vars) | add fields to `World` and set them in the `world` fixture; add your own Playwright fixtures here                              |
| `.env`                                   | `TARGET_URL` (required), `WORKERS`, `CI`                                       | add any env your steps read via `process.env`                                                                                 |
| `eslint.config.mjs` / `.prettierrc.json` | lint + format rules                                                            | standard eslint flat config / prettier options                                                                                |
| `.husky/pre-commit`                      | `lint-staged` (prettier + eslint) → `lint:steps` → `tsc`                       | add checks; `lint:steps` blocks commits with undocumented steps                                                               |

`targets` is a documented workaround for playwright-bdd's single-device limitation — each entry
becomes its own Playwright project generated into `.features-gen/<name>/`.

**Each project only runs scenarios tagged with its name:** `@desktop` scenarios run in `desktop`,
`@mobile` in `mobile`, and a scenario with both runs in both. A scenario with neither tag never runs.
A new target such as `tablet` picks up `@tablet` scenarios automatically.

## npm commands

| Command                                              | Does                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test`                                           | `bddgen` then run all scenarios (all projects)                            |
| `npm run test:headed` / `:debug` / `:trace` / `:gui` | headed / inspector / trace / UI-mode runs                                 |
| `npm run test:compile`                               | `bddgen` only — regenerate `.features-gen/` and check every step resolves |
| `npm run wiki`                                       | index steps + page objects → regenerate `.playgentic/wiki/`               |
| `npm run lint:steps`                                 | fail if any step lacks a compliant docstring (also runs in pre-commit)    |
| `npm run lint` / `typecheck` / `format`              | eslint / `tsc --noEmit` / prettier                                        |
| `npm run report:playwright`                          | open the last HTML report                                                 |

## CI

Two GitHub Actions workflows ship with the suite:

| Workflow                           | Runs                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.github/workflows/lint.yml`       | `format:check` (prettier), `lint` (eslint), `lint:steps`, `typecheck`: the same gates as pre-commit     |
| `.github/workflows/playwright.yml` | the `desktop` and `mobile` suites as parallel jobs, uploading `test-artifacts/` as a report per project |

The Playwright workflow needs one repo secret, **`TARGET_URL`**, set to the base URL of the app under test (Settings → Secrets and variables → Actions). Add `STANDARD_USER` and `STANDARD_PASS` too if your steps sign in. In CI, `slowMo` is off and failures retry once.

## The suite wiki

`.playgentic/wiki/` is where this suite describes itself to people and to coding agents:

| File                                                    | Owner     | What it is                                                                                                                                                     |
| ------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONVENTIONS.md`                                        | **you**   | Coding style and testing expectations: locators, page objects, steps, test data, what good UI and API tests look like here. Starts with the scaffold defaults. |
| `extensions/{author-tests,explorer,builder,auditor}.md` | **you**   | Extra rules for each playgentic agent. They override the agent's built-in instructions, including the guardrails.                                              |
| `index.md`, `steps/*.md`, `pages.md`                    | generated | The index of every step (by `@domain`) and page object, from `npm run wiki`.                                                                                   |

`npm run wiki` only rewrites and prunes files it generated, which are marked on line 1. Your files, and anything else you add here, are never touched. The playgentic agents read the wiki at runtime, so plugin updates never overwrite your customisations.

## Writing steps

Every step needs a docstring — it feeds the wiki and is enforced by `lint:steps`:

```ts
/**
 * @domain checkout          // grouping/category (becomes a wiki page)
 * @description adds the current product to the cart
 * @prereq a product page is open   // or: none
 * @uses page, world               // fixtures/resources used, or: none
 */
When("I add the item to my cart", async ({ page }) => {
  /* ... */
});
```

### Finding steps & running subsets by tag

- **Reuse before writing:** run `npm run wiki` and browse `.playgentic/wiki/index.md`, or grep a domain:
  `grep -rl "@domain checkout" tests/steps`.
- **Gherkin tags** (`@smoke`, `@desktop`, …) select scenarios at runtime:
  ```bash
  npx bddgen && npx playwright test --grep @smoke        # only @smoke
  npx bddgen && npx playwright test --grep-invert @slow  # skip @slow
  npx playwright test --project=desktop                  # one device project
  ```
- **Customize** by aliasing a filter into a script, e.g.
  `"test:smoke": "npx bddgen && playwright test --grep @smoke"`.

## The agent pipeline

Wired with `--agents` (or `npx playgentic agents <list>` later). This enables the
[playgentic agents](https://github.com/playgentic/playgentic-agents) plugin for each harness you picked:

| Harness        | Wiring                                                                                       | Run                                  |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| Claude Code    | `.claude/settings.json` (marketplace + enabled plugin), `CLAUDE.md` → `AGENTS.md`            | `/playgentic:author-tests --gen ...` |
| GitHub Copilot | `.github/copilot/settings.json`                                                              | the `author-tests` skill             |
| Codex          | `.codex/config.toml` (trust the project, then `codex plugin add playgentic@playgentic` once) | the `author-tests` skill             |

The pipeline works as follows:

1. Cut a feature branch, or a worktree if you confirm parallel work.
2. Learn this suite from `.playgentic/wiki/`: `CONVENTIONS.md`, the step and page-object index, and your `extensions/`.
3. Agree acceptance criteria with you.
4. Explore the live app, then build and run tests.
5. Have an auditor review them.
6. Commit only test files.

`.playgentic/config.json` sets the base branch, branch prefix, worktree policy and run command.
