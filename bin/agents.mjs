// Wires the playgentic agents plugin into a project for one or more harnesses.
// Mirrors `playwright init-agents`: the scaffold stays agent-agnostic, and this
// writes only the repo-level settings each harness reads to find and enable the
// plugin. The agents themselves live in the playgentic-agents repo and update
// through each harness's marketplace, so nothing here copies prompts.
//
// Every write is a merge: existing keys and files are kept, re-running is a no-op.

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const PROVIDERS = ["claude", "copilot", "codex"];

const MARKETPLACE = "playgentic";
const PLUGIN = "playgentic";
const REPO = "playgentic/playgentic-agents";
const PLUGIN_ID = `${PLUGIN}@${MARKETPLACE}`;

/** Parse "claude,codex" (or "all") into a validated provider list. */
export function parseProviders(value) {
  const list = String(value)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.includes("all")) return [...PROVIDERS];
  const unknown = list.filter((p) => !PROVIDERS.includes(p));
  if (unknown.length || !list.length) {
    throw new Error(`unknown --agents value "${value}". Use any of: ${PROVIDERS.join(", ")}, or all`);
  }
  return [...new Set(list)];
}

/** Write the agent wiring for each provider into `target`. Returns manual follow-up lines. */
export function setupAgents(target, providers, { ref } = {}) {
  const log = (rel, what) => console.log(`  ${what}: ${rel}`);
  writePlaygenticConfig(target, log);
  writeAgentsMd(target, log);
  const followUps = [];
  for (const p of providers) followUps.push(...WIRERS[p](target, log, ref));
  return followUps;
}

// ---------------------------------------------------------------- shared

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function writeJson(target, rel, data, log, existed) {
  const path = join(target, rel);
  mkdirSync(dirname(path), { recursive: true });
  const next = JSON.stringify(data, null, 2) + "\n";
  if (existed && readFileSync(path, "utf8") === next) return;
  writeFileSync(path, next);
  log(rel, existed ? "updated" : "added");
}

/** Deep-merge `add` into `base`, never overwriting a value the user already set. */
function mergeMissing(base, add) {
  for (const [k, v] of Object.entries(add)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      base[k] = mergeMissing(base[k] && typeof base[k] === "object" ? base[k] : {}, v);
    } else if (!(k in base)) {
      base[k] = v;
    }
  }
  return base;
}

function mergeJson(target, rel, add, log) {
  const path = join(target, rel);
  const existed = existsSync(path);
  writeJson(target, rel, mergeMissing(readJson(path), add), log, existed);
}

function currentBranch(target) {
  try {
    return execSync("git branch --show-current", { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || "main";
  } catch {
    return "main";
  }
}

const START = "<!-- playgentic:start -->";
const END = "<!-- playgentic:end -->";

/** Insert or refresh a marked block in a markdown file, leaving everything else alone. */
function upsertBlock(target, rel, block, log) {
  const path = join(target, rel);
  const wrapped = `${START}\n${block.trim()}\n${END}`;
  if (!existsSync(path)) {
    writeFileSync(path, wrapped + "\n");
    return log(rel, "added");
  }
  const text = readFileSync(path, "utf8");
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  const next = re.test(text) ? text.replace(re, wrapped) : `${text.replace(/\n*$/, "\n\n")}${wrapped}\n`;
  if (next !== text) {
    writeFileSync(path, next);
    log(rel, "updated");
  }
}

function writePlaygenticConfig(target, log) {
  mergeJson(
    target,
    ".playgentic/config.json",
    {
      preferredBaseBranch: currentBranch(target),
      branchPrefix: "test/",
      worktrees: "ask",
      runCommand: "npx bddgen && npx playwright test",
    },
    log,
  );
}

// The plugin is convention-agnostic. This block points any coding agent (with or
// without the plugin) at the suite wiki, where the user-owned CONVENTIONS.md and
// per-agent extensions live. The conventions themselves stay in the wiki so this
// block never needs to change when the user edits them.
const CONVENTIONS = `
## Test suite (playgentic)

Before writing or reviewing tests, read the suite wiki in \`.playgentic/wiki/\`:

- \`CONVENTIONS.md\`: how this suite is written and what good tests look like here. It takes precedence over your defaults.
- \`index.md\`: the generated index of every step and page object. Reuse them before writing new ones, and run \`npm run wiki\` after changing them.
- \`extensions/<agent>.md\`: extra rules for each playgentic agent (author-tests, explorer, builder, auditor). They override that agent's built-in instructions.
`;

function writeAgentsMd(target, log) {
  upsertBlock(target, "AGENTS.md", CONVENTIONS, log);
}

// ---------------------------------------------------------------- providers

function claude(target, log, ref) {
  // Claude reads CLAUDE.md, not AGENTS.md; an @-import keeps one source of truth.
  upsertBlock(target, "CLAUDE.md", "@AGENTS.md", log);
  mergeJson(
    target,
    ".claude/settings.json",
    {
      extraKnownMarketplaces: {
        [MARKETPLACE]: { source: { source: "github", repo: REPO, ...(ref ? { ref } : {}) } },
      },
      enabledPlugins: { [PLUGIN_ID]: true },
    },
    log,
  );
  // The settings register and enable the plugin, but don't install it. Install it
  // from the trust prompt, or by its plugin@marketplace id (Claude Code has no
  // --marketplace flag; the marketplace is already registered above).
  return [
    `Claude Code: trust the folder and accept the plugin install prompt, or run once: claude plugin install ${PLUGIN_ID} --scope project`,
  ];
}

function copilot(target, log, ref) {
  mergeJson(
    target,
    ".github/copilot/settings.json",
    {
      extraKnownMarketplaces: {
        [MARKETPLACE]: { source: { source: "github", repo: REPO, ...(ref ? { ref } : {}) } },
      },
      enabledPlugins: { [PLUGIN_ID]: true },
    },
    log,
  );
  return [`Copilot CLI: copilot plugin marketplace add ${REPO} && copilot plugin install ${PLUGIN_ID}`];
}

function codex(target, log, ref) {
  // Codex reads project config only for trusted projects, and still needs a
  // one-time `codex plugin add` per user; the config makes the marketplace known
  // and the plugin enabled for everyone who trusts the repo.
  const rel = ".codex/config.toml";
  const path = join(target, rel);
  const existed = existsSync(path);
  let text = existed ? readFileSync(path, "utf8") : "";
  const blocks = [];
  if (!text.includes(`[marketplaces.${MARKETPLACE}]`)) {
    blocks.push(
      [
        `[marketplaces.${MARKETPLACE}]`,
        `source_type = "git"`,
        `source = "https://github.com/${REPO}.git"`,
        ...(ref ? [`ref = "${ref}"`] : []),
      ].join("\n"),
    );
  }
  if (!text.includes(`[plugins."${PLUGIN_ID}"]`)) {
    blocks.push(`[plugins."${PLUGIN_ID}"]\nenabled = true`);
  }
  if (blocks.length) {
    mkdirSync(dirname(path), { recursive: true });
    text = (text ? text.replace(/\n*$/, "\n\n") : "") + blocks.join("\n\n") + "\n";
    writeFileSync(path, text);
    log(rel, existed ? "updated" : "added");
  }
  return [`Codex: trust the project, then run once: codex plugin add ${PLUGIN_ID}`];
}

const WIRERS = { claude, copilot, codex };
