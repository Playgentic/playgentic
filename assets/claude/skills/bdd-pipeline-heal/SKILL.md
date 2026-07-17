---
name: bdd-pipeline-heal
description: skill for healing existing tests when they break due to script issues, flakiness, etc.
---

## Cardinal Rules

1. Only the explorer agent is allowed to launch the browser via mcp , everyone else must dispatch an explorer agent.
2. Never edit prod `tests/` directly. All healing happens on **copies** inside an ephemeral `.agent-sessions/` session, and only lands in prod when the user promotes at the end.

## Overview

This workflow heals **existing** coverage that has broken — stale locators, changed flows, timing/flakiness, or assertions that no longer hold. The healed test must still genuinely verify the feature; do not "heal" a test by weakening it into something that passes while asserting nothing.

## Workflow

### 1. Check your working branch

```bash
git rev-parse --git-dir
git branch --show-current
```

You should never run on main or master. If you are currently on that branch, offer to create a fix branch instead.

### 2. Load the failure signal

Gather what actually broke: the failing Playwright/cucumber report, the error + stack, the flaky step, CI logs, or the user's description. Load any referenced Jira/GitHub issue. You need to know **which scenario and which step** fail, and how.

### 3. Identify the failing test(s) and the steps in play

Locate the prod `.feature` scenario(s) and the `*.steps.ts` file(s) that own the failing steps. Refresh and read the wiki to understand those steps and any shared ones:

```bash
npm run wiki
```

Read `docs/index.md` and the relevant `docs/<domain>.md` pages rather than grepping blindly.

### 4. Create the ephemeral working session

Bootstrap a session and `--extend` the failing feature file plus the step file(s) that own the failing steps so you heal copies, not the originals (`tests/baseTest.ts` is copied automatically):

```bash
npm run agent:new "heal-<short-name>" --extend tests/features/<file>.feature --extend tests/steps/<file>.steps.ts
export AGENT_SESSION=<session>
```

All edits go inside `.agent-sessions/<session>/`.

### 5. Reproduce the failure in-session

Confirm the copy fails the same way before changing anything:

```bash
AGENT_SESSION=<session> npm run test:agent
```

If it can't be reproduced (passes in-session, or fails only intermittently), say so — the fix may be flakiness/waits rather than a broken locator, and note that for the explorer.

### 6. Dispatch the explorer to heal

Launch the `bdd-explorer` subagent with the session name, the failing test ids/titles, the observed failure, and the business context. It re-explores the **live** app (never trusting stale locators or artifacts), repairs the step logic/locators/waits in-session, and loops via `test_debug` until the test is green or it documents a `FAIL_REASON.md`. Keep every step's docstring compliant.

### 7. Adversarial review

Launch the `bdd-auditor` subagent on the healed files with the original failure context. Its priority here is catching a fix that passes without verifying — weakened or removed assertions. It writes a rated report to `.claude/audits/`. Resolve any **BLOCK** findings before promoting.

### 8. Present results and promote on approval

Summarize the root cause, what changed, and the auditor's verdict. **Do NOT promote automatically.** Only when the user explicitly approves:

```bash
npm run agent:promote <session>
```

This lints the session's docstrings, copies the healed `tests/**` over prod, regenerates the wiki, and typechecks. After a clean promotion, clean up and commit on the fix branch:

```bash
rm -rf .agent-sessions/<session>
```
