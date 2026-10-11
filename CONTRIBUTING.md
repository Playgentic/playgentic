# Contributing

`playgentic` is the npm scaffolder for an opinionated Playwright-BDD suite. The agents live in [playgentic-agents](https://github.com/playgentic/playgentic-agents), and the docs site in [playgentic-docs](https://github.com/playgentic/playgentic-docs).

## Layout

| Path | What |
| --- | --- |
| `bin/cli.mjs` | the CLI: `init`, `agents` |
| `bin/agents.mjs` | `--agents` wiring for Claude Code, Copilot and Codex (merge-only writes) |
| `template/` | the scaffolded suite, copied by `init` |
| `scripts/smoke.mjs` | CI smoke test: scaffolds into temp dirs and checks the result (not shipped) |
| `scripts/release.mjs` | release helpers (not shipped) |

Everything is zero-dependency Node. Run `npm run smoke` before sending changes.

## Template rules

- In `.playgentic/wiki/`, `CONVENTIONS.md` and `extensions/` belong to the user. `init` ships them once, and nothing may rewrite them. Generated wiki files must carry the marker on line 1, because that marker is what `gen-wiki` uses to decide what it can rewrite or prune.
- `template/gitignore` ships without its dot because npm would otherwise drop it; `init` restores the name.

## Releasing

Record changes under `## [Unreleased]` in `CHANGELOG.md` as you go (Keep a Changelog).

Releases are split between a skill and CI:

- **`/release` skill** (`.claude/skills/release/`):
  1. runs the checks and proposes a semver bump from the Unreleased entries
  2. runs `node scripts/release.mjs bump x.y.z`, which updates `package.json` and the changelog
  3. commits, tags `vx.y.z`, and pushes after you confirm
- **`.github/workflows/release.yml`** runs on the pushed `v*.*.*` tag:
  1. re-runs CI
  2. verifies the tag matches `package.json`
  3. creates the GitHub release from that version's changelog section
  4. publishes to npm with provenance

To release without Claude, run `node scripts/release.mjs bump x.y.z`, then commit, tag and push the tag yourself.

Publishing needs an `NPM_TOKEN` repo secret, and the repo must be public for npm provenance. If publishing fails after the GitHub release was created, re-run the workflow on the tag; it skips the existing release.
