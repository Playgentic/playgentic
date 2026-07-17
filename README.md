# playgentic

Scaffold an agentic [Playwright-BDD](https://github.com/vitalets/playwright-bdd) test suite with my 
[Claude Code](https://claude.ai/code) agent workflows and agents for test automation. I update the agents here as I improve them so they can be easily synced by consumers.

## Quick start

Scaffold a new suite:

```bash
npx playgentic init my-suite
cd my-suite
cp .env.example .env        # set TARGET_URL to your app
npx playwright install
npm run wiki                # generate the step wiki under docs/
npm test                    # run the example scenario
```

Add the suite to an **existing** project (merges into your `package.json`, never clobbers it):

```bash
cd my-existing-app
npx playgentic init .
```

## Keeping agents up to date

The agent definitions (`.claude/skills`, `.claude/agents`) are managed by playgentic. When this
package ships a new version, pull the changes into any scaffolded project:

```bash
npx playgentic sync          # overwrite managed agent defs to the newest version
npx playgentic sync --dry    # preview what would change
```

`sync` overwrites `.claude/skills` and `.claude/agents`, but never touches `.claude/rules`
(e.g. `code-styles.md`) or your own added skills/agents — those are yours.

## What you get

- **BDD suite** — a basic `playwright-bdd` boiler with `desktop`/`mobile` projects, an example feature + step,
  a scenario-scoped `world` fixture, a husky pre-commit hook, and linting and formatting via eslint/prettier.
- **Step wiki** — `npm run wiki` parses the `@domain/@description/@prereq/@uses` docstrings on
  every step and generates a browsable catalogue under `docs/`.
- **Docstring lint** — `npm run lint:steps` (in pre-commit) fails if any step lacks a compliant
  docstring, this will keep your test architecture indexed into the generated wiki each time.
- **Agent pipeline** — Claude Code skills (`/bdd-pipeline --gen|--heal`) that scaffold work in an
  isolated `.agent-sessions/` session, drive an explorer subagent against a dedicated
  `agent-session` Playwright runner, review with an auditor, and promote into your suite only on
  approval. Requires the `playwright-test` MCP server.

See **[docs/agent-design.md](docs/agent-design.md)** for how the pipeline is designed — component
map, the gen/heal loops, runner isolation, and the sync model, with diagrams.

## Requirements

- Node >= 18
- For the agent pipeline: Claude Code with the `playwright-test` MCP server (wired in `.mcp.json`).

## License

MIT 
