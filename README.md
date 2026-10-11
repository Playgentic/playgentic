# playgentic

Scaffold an opinionated [Playwright-BDD](https://github.com/vitalets/playwright-bdd) test suite. You can also wire in the [playgentic agents](https://github.com/playgentic/playgentic-agents) harness for **Claude Code**, **GitHub Copilot** and/or **Codex** at the same time, the same way Playwright's own `init-agents` works.

## Quick start

Scaffold a new suite with agents:

```bash
npx playgentic init my-suite --agents claude,copilot,codex   # any subset, or "all"
cd my-suite
cp .env.example .env        # set TARGET_URL to your app
npx playwright install
npm run wiki                # index steps + page objects into .playgentic/wiki/
npm test                    # run the example scenario
```

Leave out `--agents` for just the suite. You can add agents later from the project root:

```bash
npx playgentic agents claude
```

Add the suite to an **existing** project. It merges into your `package.json` and never clobbers it:

```bash
cd my-existing-app
npx playgentic init .
```

## What you get

- **BDD suite.** A `playwright-bdd` boilerplate with:
  - `desktop` and `mobile` projects
  - an example feature and step
  - a scenario-scoped `world` fixture
  - a husky pre-commit hook
  - eslint and prettier
  - a pre-commit hook that runs prettier and eslint on staged files, plus the docstring lint and typecheck
  - two GitHub Actions workflows:
    - **Lint:** prettier, eslint, docstring lint and typecheck
    - **Playwright:** runs the desktop and mobile suites against the app at the `TARGET_URL` repo secret
- **Suite wiki** in `.playgentic/wiki/`:
  - **`CONVENTIONS.md`:** your coding style and testing expectations (UI, API, locators, page objects, data).
  - **`extensions/<agent>.md`:** rules that extend or override each playgentic agent.
  - **Generated index:** `npm run wiki` builds an index of every step (from its `@domain/@description/@prereq/@uses` docstring) and every page object. It only ever rewrites its own generated files, so your edits survive both re-runs and agent plugin updates.
- **Docstring lint.** `npm run lint:steps` runs in pre-commit and fails if any step lacks a compliant docstring, so the wiki always stays complete.
- **Agent harness** (`--agents`). Makes the playgentic agents plugin available and enabled for each harness:

  | Harness | Files written |
  | --- | --- |
  | all | `.playgentic/config.json`, plus an `AGENTS.md` block pointing any coding agent at `.playgentic/wiki/` |
  | `claude` | `.claude/settings.json` (marketplace + `enabledPlugins`), `CLAUDE.md` importing `AGENTS.md`. Each user still installs the plugin once: accept the prompt when trusting the folder, or run `claude plugin install playgentic@playgentic --scope project` |
  | `copilot` | `.github/copilot/settings.json` |
  | `codex` | `.codex/config.toml` (marketplace + enabled plugin; each user still runs `codex plugin add playgentic@playgentic` once) |

  Every write is a merge. Existing keys are kept, and re-running is a no-op. Use `--agents-ref <tag>` to pin the agents to a release.

The agents themselves live in [playgentic-agents](https://github.com/playgentic/playgentic-agents) and update through each harness's plugin marketplace. Nothing is copied into your repo, so there's nothing to sync.

## Requirements

- Node >= 22.22.1 (required by the scaffolded suite's tooling)
- For the agents: Claude Code, GitHub Copilot CLI, or Codex with plugin support

## License

MIT
