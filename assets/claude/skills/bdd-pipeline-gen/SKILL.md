---
name: bdd-pipeline-gen
description: skill for extending or generating new test coverage within the suite
---
## Cardinal Rules

1) Only the explorer agent is allowed to launch the browser via mcp , everyone else must dispatch an explorer agent


## Overview

The workflow defined in this skill file will detail how agents contributing to the the project should extend existing test infra, build net new scenarios and coverage , and gather context for test writing within this project. 


## Workflow 

### 1. check your working branch 

```bash
git rev-parse --git-dir 
git branch --show-current
```
You should never run on main or master,  if you are currently on that branch offer to create a feature branch instead. 

### 2. load external material , if any

Some users will want you to load Jira tickets, Github issues, etc. You should load any issues they reference etc at this point so you have the info you need to build tests.  

### 3.  Plan test cases,  talk to the user about what they need coverage for and get clarity where neededc

Take this time to understand the buisness logic , the test scope , and the Acceptance Criteria needed for the test coverage the user is requesting. Ask questions over assuming , this is an important step to building intuitive tests

### 4. Study existing architecture via the step wiki

Refresh the wiki so it reflects the current suite, then read it:

```bash
npm run wiki
```

This regenerates `docs/` — `docs/index.md` is the overview (every `@domain` and its step count), and each `docs/<domain>.md` lists the steps in that domain with their description, prereqs, and source. Start there and **strive to reuse existing steps**. DO NOT do a ton of random grepping through the codebase looking for test steps — start with the wiki, open a specific step's source only if you need more depth, but don't burn tokens on dumb exploration.

### 5. Create the ephemeral working session

Never edit prod `tests/` in this pipeline. Instead bootstrap an isolated session — it mirrors the `tests/` layout, copies `tests/baseTest.ts`, and copies any existing files you intend to **extend** so you edit a copy, not the original:

```bash
npm run agent:new "<short-name>" --extend tests/steps/<file>.steps.ts --extend tests/features/<file>.feature
```

Note the printed session name (e.g. `2026-07-16-<short-name>`). **All** of your changes go inside `.agent-sessions/<session>/`. Export the session for every run so the dedicated `agent-session` runner targets it:

```bash
export AGENT_SESSION=<session>
```

### 6. Scaffold features + step stubs in the session

Write your `.feature` files into `.agent-sessions/<session>/tests/features/`, reusing cataloged steps wherever possible. For genuinely new steps, add a stub to a session steps file that **throws PENDING** — this is the signal the explorer keys on:

```ts
/**
 * @domain <domain>
 * @description <what this step does>
 * @prereq <preconditions, or none>
 * @uses <fixtures used, or none>
 */
Given("my new step", async () => {
  throw new Error("PENDING exploration: my new step");
});
```

Every step — stubs included — needs a compliant docstring (`@domain`, `@description`, `@prereq`, `@uses`); promotion is blocked otherwise. Then confirm the features resolve to steps (`missingSteps: "fail-on-gen"` will flag any unmatched step):

```bash
AGENT_SESSION=<session> npm run test:compile
```

### 7. Dispatch the explorer to build out the stubs

Remember the Cardinal Rule: only the explorer drives the browser. Launch the `bdd-explorer` subagent and give it the **session name**, the scaffolded test ids/titles, and the business context. It runs the tests via `AGENT_SESSION=<session> npm run test:agent` / `test_debug`, explores the live app, completes each PENDING stub in-session, and returns a summary plus a results json (and a `FAIL_REASON.md` for any test it can't get green).

### 8. Adversarial review

Launch the `bdd-auditor` subagent on the session's modified files together with the original inputs (prompt / ticket / AC). It writes a rated report to `.claude/audits/`. Resolve any **BLOCK** findings — loop back to step 6/7 as needed — before promoting.

### 9. Present results and promote on approval

Summarize to the user: what scenarios/steps were added, the explorer's results, and the auditor's verdict. **Do NOT promote automatically.** Only when the user explicitly approves, promote the session into prod:

```bash
npm run agent:promote <session>
```

This lints the session's docstrings, copies the session's `tests/**` over prod (extending existing files, adding new ones), regenerates the wiki, and typechecks. After a clean promotion, clean up and commit on the feature branch:

```bash
rm -rf .agent-sessions/<session>
```