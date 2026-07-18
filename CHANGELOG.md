# Changelog

All notable changes to **playgentic** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [0.1.0] - 2026-07-17

First published release. Manually released to npm to enable iterating on it across projects.
Everything below is part of this initial release.

### Added

#### CLI (`bin/cli.mjs`)

- Zero-dependency Node CLI (Node built-ins only, `engines.node >= 18`), exposed as the
  `playgentic` bin.
- `playgentic init [dir] [--no-install]` — scaffold a new Playwright-BDD suite into `dir`
  (default `.`), or merge into an existing project by writing/merging `package.json` instead
  of clobbering it. Refuses to init over an existing Playwright project (points at `sync`),
  restores the dotless shipped `gitignore` to `.gitignore`, layers managed agent assets into
  `.claude/`, and runs `git init` when the target is not already a repo.
- `playgentic sync [--dry]` — overwrite the managed `.claude/skills` and `.claude/agents`
  definitions to the installed package version, while never touching `.claude/rules` or any
  user-added skills/agents. `--dry` previews the file changes without writing.
- `--version` and `--help` output.

#### Playwright-BDD template (`template/`)

- `playwright-bdd` boilerplate with `desktop` and `mobile` Playwright projects
  (`playwright.config.ts`).
- Example feature and step (`tests/features/example.feature`, `tests/steps/example.steps.ts`)
  and a scenario-scoped `world` fixture (`tests/baseTest.ts`).
- Husky `pre-commit` and `commit-msg` hooks with lint-staged, plus ESLint and Prettier
  configuration.
- `tsconfig.json`, `.env.example` (set `TARGET_URL`), and `.mcp.json` wiring the
  `playwright-test` MCP server.

#### Step wiki

- `npm run wiki` (`scripts/gen-wiki.mjs` + `scripts/lib/parse-steps.mjs`) parses the
  `@domain` / `@description` / `@prereq` / `@uses` docstrings on every step and generates a
  browsable catalogue under `docs/`.
- `npm run lint:steps` (`scripts/lint-steps.mjs`, wired into pre-commit) fails the commit if
  any step lacks a compliant docstring, keeping the wiki index accurate.

#### Agent pipeline (`assets/claude/`)

- Claude Code skills `/bdd-pipeline --gen|--heal` (`bdd-pipeline`, `bdd-pipeline-gen`,
  `bdd-pipeline-heal`) that scaffold work in an isolated `.agent-sessions/` session, drive an
  explorer subagent against a dedicated `agent-session` Playwright runner, review with an
  auditor, and promote into the suite only on approval.
- `bdd-explorer` and `bdd-auditor` agent definitions and a `code-styles.md` rule.
- Session helpers `scripts/new-agent-session.mjs` and `scripts/promote-agent-session.mjs`.
- Requires the `playwright-test` MCP server.

#### Scaffolded-project CI & infrastructure

- GitHub Actions workflows for the generated suite: `ci.yml`, `codeql.yml`, and `gitleaks.yml`
  (with `gitleaks.toml`), plus Dependabot config, a pull request template, and VS Code
  settings/recommended extensions.

#### Package & repository infrastructure

- `scripts/smoke.mjs` smoke test wired into `prepublishOnly`, and a `pack:check` script
  (`npm pack --dry-run`).
- Repository CI (`.github/workflows/ci.yml`) and publish (`.github/workflows/publish.yml`)
  workflows.
- MIT license, `README.md`, and the `docs/agent-design.md` design doc (component map, the
  gen/heal loops, runner isolation, and the sync model).

[Unreleased]: https://github.com/BlaiseMoses01/playgentic/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/BlaiseMoses01/playgentic/releases/tag/v0.1.0
