# Changelog

All notable changes to **playgentic** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Marketplaces are referenced by full GitHub URL.** Claude Code's `.claude/settings.json` now registers the agents marketplace as a `git` source (`https://github.com/playgentic/playgentic-agents.git`) instead of the `owner/repo` shorthand, and the printed Copilot hint uses `copilot plugin marketplace add https://github.com/playgentic/playgentic-agents`.
- The agents plugin now bundles the generic Playwright MCP (`npx @playwright/mcp@latest`) instead of `playwright-test`.

## [0.3.1] - 2026-10-11

### Fixed

- **The Claude Code install hint printed by `--agents` / `playgentic agents`** used a `--marketplace` flag that Claude Code doesn't have. It now says `claude plugin install playgentic@playgentic --scope project`. The READMEs also note that writing the settings doesn't install the plugin: each user accepts the install prompt or runs that command once.

## [0.3.0] - 2026-10-11

### Added

- **Two template CI workflows:**
  - `lint.yml` runs prettier, eslint, the step docstring lint and the typecheck.
  - `playwright.yml` runs the `desktop` and `mobile` suites against the `TARGET_URL` repo secret (with optional `STANDARD_USER`/`STANDARD_PASS`) and uploads a report per project.

### Changed

- **The template ships formatter-clean:** a fresh scaffold passes its own `format:check`, `lint`, `lint:steps` and `typecheck`.
- **Pre-commit** runs prettier and eslint on staged files (via lint-staged), then the docstring lint and typecheck.
- **`slowMo`** is off for the desktop project in CI.
- **Device tags now filter projects.** Each device project only runs scenarios tagged with its name: `@desktop` in `desktop`, `@mobile` in `mobile`, both tags in both. Previously every scenario ran in every project, whatever its tags.
  - Untagged scenarios no longer run, so add `@desktop` and/or `@mobile` to existing scenarios.
  - The example feature now has a scenario for each device.
  - The Playwright CI job passes `--pass-with-no-tests`, so a device with no scenarios yet doesn't fail.

- **Dependencies updated** for scaffolded suites:
  - `@playwright/test` 1.64
  - `playwright-bdd` 9.2.1
  - `eslint` 10.12
  - `typescript-eslint` 8.71
  - `prettier` 3.9.10
  - `lint-staged` 17.6
  - `@types/node` 26.6
  - `dotenv` 18. Only `node -r dotenv/config` preloading was removed; the suite's `import "dotenv/config"` is unaffected.
- **TypeScript pinned to `~6.0.3`.** `typescript-eslint` supports `<6.1`, and TypeScript 7 (the native port) has no stable JS API yet, so it stays on 6.0.x until typescript-eslint supports it.
- **Node ≥ 22.22.1 is now required**, by both the CLI and scaffolded suites (`engines`). `lint-staged` 17.6 requires it, and Node 18 and 20 are end-of-life. The repo's own CI runs on Node 22.
- **GitHub Actions updated:** the template workflows use `checkout`/`setup-node`/`upload-artifact` `@v7`, and the repo's own workflows are pinned to `checkout` v7.0.1 and `setup-node` v7.1.0.

### Fixed

- **`report:cucumber`** now opens `test-artifacts/cucumber-report.html` (it pointed at a folder that doesn't exist).

### Removed

- **The unused `dotenv` devDependency** from the CLI package.
- **Vendor- and editor-specific template files:**
  - dependabot
  - the gitleaks config and workflow
  - CodeQL
  - the pull request template
  - `.vscode/`
  - the disabled commitlint `commit-msg` hook
- **Template `ci.yml`**, replaced by `lint.yml`.

## [0.2.0] - 2026-10-11

The scaffold and the agents are now separate products. playgentic scaffolds the suite, and the agents live in the [playgentic-agents](https://github.com/playgentic/playgentic-agents) plugin for Claude Code, GitHub Copilot and Codex.

### Added

- **`--agents <claude,copilot,codex|all>` on `init`, plus `playgentic agents <list>`** for existing projects. It wires the agents plugin into the repo for each harness. All writes are merges and re-running is a no-op.
  - **All harnesses:** `.playgentic/config.json`, and an `AGENTS.md` block describing this suite's conventions (docstring tags, step wiki, `world` fixture, run commands). This is how the convention-agnostic agents learn the scaffold's opinions.
  - **Claude Code:** `.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`), and `CLAUDE.md` importing `AGENTS.md`.
  - **GitHub Copilot:** `.github/copilot/settings.json`.
  - **Codex:** `.codex/config.toml`, with the marketplace and the plugin enabled.
- **`--agents-ref <ref>`** pins the agents marketplace to a tag or branch.
- **Suite wiki in `.playgentic/wiki/`**, replacing the old `docs/` step wiki.
  - **User-owned, seeded once by `init`:**
    - `CONVENTIONS.md` for coding style and testing expectations (locators, page objects, steps, data, UI and API tests)
    - `extensions/{author-tests,explorer,builder,auditor}.md` for per-agent rules that override the agents' built-in instructions, guardrails included
  - **Generated by `npm run wiki`:**
    - `index.md`, which links the user files
    - `steps/<domain>.md`
    - `pages.md`, a new page-object index built from exported classes under `tests/pages/` and their public members
  - Only marker-carrying generated files are ever rewritten or pruned. The agents read the wiki at runtime, so plugin updates never overwrite customisations.
- **Page objects:** the template now ships `tests/pages/BasePage.ts`, and the example step uses it.
- **Release tooling.** A repo-local `/release` skill proposes the version, bumps it, tags and pushes. The tag-triggered `release.yml` re-runs CI, creates the GitHub release from the changelog, and publishes to npm. It replaces `publish.yml`.
- **Smoke test** covers:
  - the `--agents all` wiring, idempotency, preserving user content, and rejecting unknown providers
  - wiki generation, and that wiki re-runs never touch user files

### Removed (BREAKING)

- **Bundled Claude assets** (`assets/claude/`: the `bdd-pipeline` skills, the `bdd-explorer`/`bdd-auditor` agents, rules) are gone. The agents now ship as a plugin.
- **`playgentic sync`** is gone. Plugins update through their marketplaces, so there is nothing to sync.
- **The `.agent-sessions/` model** is gone, including the `agent-session` Playwright project, the `test:agent`/`agent:new`/`agent:promote` scripts, and their helper scripts. The agents work on a feature branch (or a worktree) instead.
- **`template/.mcp.json`** is gone. The plugin bundles the `playwright-test` MCP server.
- **The docs site (`docs/`)** has moved to its own repo, [playgentic-docs](https://github.com/playgentic/playgentic-docs). This package is now dedicated to the suite scaffold, and `homepage` points at the README.
- **The step wiki in `docs/`** is gone. It now lives in `.playgentic/wiki/`.

### Changed

- The repo moved to the [playgentic GitHub org](https://github.com/playgentic). `--agents` now points at `playgentic/playgentic-agents`.
- The `AGENTS.md` block written by `--agents` now points coding agents at `.playgentic/wiki/` instead of embedding the conventions.
- The README and template README describe the new split and the wiki.

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

[Unreleased]: https://github.com/playgentic/playgentic/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/playgentic/playgentic/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/playgentic/playgentic/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/playgentic/playgentic/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/playgentic/playgentic/releases/tag/v0.1.0
