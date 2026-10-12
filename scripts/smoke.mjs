// CI smoke test (not shipped — the package's `files` whitelist excludes scripts/).
// Scaffolds suites into temp dirs, asserts the key files landed, runs the
// zero-dependency gates straight from the scaffold (no npm install needed), and
// checks the --agents wiring is complete and idempotent.

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve("bin/cli.mjs");
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const read = (dir, f) => readFileSync(join(dir, f), "utf8");
const json = (dir, f) => JSON.parse(read(dir, f));

function assertFiles(dir, files, { absent = false } = {}) {
  for (const f of files) {
    if (existsSync(join(dir, f)) === absent) {
      throw new Error(`scaffold ${absent ? "should not have" : "missing"} file: ${f}`);
    }
  }
}

const AGENT_FILES = [
  ".playgentic/config.json",
  "AGENTS.md",
  "CLAUDE.md",
  ".claude/settings.json",
  ".github/copilot/settings.json",
  ".codex/config.toml",
];

const dirs = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "playgentic-smoke-"));
  dirs.push(d);
  return d;
};

try {
  // --- suite only ----------------------------------------------------------
  const plain = tmp();
  run(`node "${CLI}" init "${plain}" --no-install`);
  assertFiles(plain, [
    "playwright.config.ts",
    "tests/baseTest.ts",
    "tests/steps/example.steps.ts",
    "scripts/gen-wiki.mjs",
    ".gitignore",
    "package.json",
    ".husky/pre-commit",
    ".github/workflows/lint.yml",
    ".github/workflows/playwright.yml",
  ]);
  // Broadly usable: no vendor-specific extras. The one editor extra (VS Code Cucumber glue)
  // is on by default and opt-out with --no-editor.
  assertFiles(
    plain,
    [".github/dependabot.yml", ".github/workflows/codeql.yml", ".github/workflows/gitleaks.yml"],
    { absent: true },
  );
  assertFiles(plain, [".vscode/settings.json", ".vscode/extensions.json"]);
  const vscode = json(plain, ".vscode/settings.json");
  if (!vscode["cucumber.glue"]?.includes("tests/steps/**/*.steps.ts")) throw new Error("cucumber glue missing steps");
  if (!vscode["cucumber.features"]?.includes("tests/features/**/*.feature")) throw new Error("cucumber features glob missing");
  if (!json(plain, ".vscode/extensions.json").recommendations?.includes("cucumberopen.cucumber-official")) {
    throw new Error("cucumber extension not recommended");
  }
  assertFiles(plain, [...AGENT_FILES, ".claude", ".mcp.json"], { absent: true });

  // These run on plain node — prove the template's tooling is coherent.
  assertFiles(plain, [
    "tests/pages/BasePage.ts",
    ".playgentic/wiki/CONVENTIONS.md",
    ...["author-tests", "explorer", "builder", "auditor"].map((a) => `.playgentic/wiki/extensions/${a}.md`),
  ]);
  run("node scripts/gen-wiki.mjs", plain);
  run("node scripts/lint-steps.mjs", plain);
  assertFiles(plain, [".playgentic/wiki/index.md", ".playgentic/wiki/pages.md", ".playgentic/wiki/steps/common-steps.md"]);
  assertFiles(plain, ["docs"], { absent: true });

  const index = read(plain, ".playgentic/wiki/index.md");
  for (const link of ["CONVENTIONS.md", "extensions/builder.md", "steps/common-steps.md", "BasePage"]) {
    if (!index.includes(link)) throw new Error(`wiki index does not link ${link}`);
  }
  if (!read(plain, ".playgentic/wiki/pages.md").includes("async goto()")) throw new Error("page object members not indexed");

  // Re-running the wiki never touches user-owned files, and prunes only its own stale pages.
  const userOwned = [".playgentic/wiki/CONVENTIONS.md", ".playgentic/wiki/extensions/builder.md", ".playgentic/wiki/NOTES.md"];
  writeFileSync(join(plain, ".playgentic/wiki/NOTES.md"), "# my notes\n");
  writeFileSync(join(plain, ".playgentic/wiki/CONVENTIONS.md"), "# customised\n");
  writeFileSync(join(plain, ".playgentic/wiki/steps/old-domain.md"), read(plain, ".playgentic/wiki/steps/common-steps.md"));
  const before = userOwned.map((f) => read(plain, f));
  run("node scripts/gen-wiki.mjs", plain);
  userOwned.forEach((f, i) => {
    if (read(plain, f) !== before[i]) throw new Error(`wiki re-run changed user file ${f}`);
  });
  assertFiles(plain, [".playgentic/wiki/steps/old-domain.md"], { absent: true });
  if (!read(plain, ".playgentic/wiki/index.md").includes("NOTES.md")) throw new Error("index does not link user notes");

  // --- --no-editor -----------------------------------------------------------
  const noEditor = tmp();
  run(`node "${CLI}" init "${noEditor}" --no-install --no-editor`);
  assertFiles(noEditor, [".vscode"], { absent: true });

  // --- existing project: editor config merges, never clobbers -----------------
  const existing = tmp();
  run("mkdir -p .vscode", existing);
  writeFileSync(join(existing, "package.json"), JSON.stringify({ name: "app" }) + "\n");
  writeFileSync(
    join(existing, ".vscode/settings.json"),
    JSON.stringify({ "editor.tabSize": 4, "cucumber.glue": ["src/my-steps/**/*.ts"] }) + "\n",
  );
  writeFileSync(join(existing, ".vscode/extensions.json"), JSON.stringify({ recommendations: ["esbenp.prettier-vscode"] }) + "\n");
  run(`node "${CLI}" init . --no-install`, existing);
  const merged = json(existing, ".vscode/settings.json");
  if (merged["editor.tabSize"] !== 4) throw new Error("editor merge dropped a user setting");
  if (merged["cucumber.glue"]?.[0] !== "src/my-steps/**/*.ts") throw new Error("editor merge overwrote user cucumber.glue");
  if (!merged["cucumber.features"]) throw new Error("editor merge did not add cucumber.features");
  const recs = json(existing, ".vscode/extensions.json").recommendations;
  if (!recs.includes("esbenp.prettier-vscode") || !recs.includes("cucumberopen.cucumber-official")) {
    throw new Error("extension recommendations not merged");
  }

  // --- suite + all agents ---------------------------------------------------
  const agents = tmp();
  run(`node "${CLI}" init "${agents}" --no-install --agents all`);
  assertFiles(agents, AGENT_FILES);

  const claude = json(agents, ".claude/settings.json");
  if (claude.enabledPlugins?.["playgentic@playgentic"] !== true) throw new Error("claude plugin not enabled");
  if (!claude.extraKnownMarketplaces?.playgentic?.source?.url) throw new Error("claude marketplace missing");
  if (json(agents, ".github/copilot/settings.json").enabledPlugins?.["playgentic@playgentic"] !== true) {
    throw new Error("copilot plugin not enabled");
  }
  const toml = read(agents, ".codex/config.toml");
  if (!toml.includes("[marketplaces.playgentic]") || !toml.includes('[plugins."playgentic@playgentic"]')) {
    throw new Error("codex config incomplete");
  }
  if (!read(agents, "CLAUDE.md").includes("@AGENTS.md")) throw new Error("CLAUDE.md does not import AGENTS.md");
  if (!read(agents, "AGENTS.md").includes(".playgentic/wiki/")) throw new Error("AGENTS.md does not point at the wiki");

  // --- idempotent, and never clobbers user content ---------------------------
  const settings = join(agents, ".claude/settings.json");
  writeFileSync(settings, JSON.stringify({ ...claude, permissions: { allow: ["Bash(ls)"] } }, null, 2) + "\n");
  writeFileSync(join(agents, "AGENTS.md"), "# My notes\n\n" + read(agents, "AGENTS.md"));
  const snapshot = AGENT_FILES.map((f) => read(agents, f));
  run(`node "${CLI}" agents all`, agents);
  AGENT_FILES.forEach((f, i) => {
    if (read(agents, f) !== snapshot[i]) throw new Error(`re-running agents changed ${f}`);
  });

  // --- bad provider is rejected ---------------------------------------------
  let rejected = false;
  try {
    execSync(`node "${CLI}" agents cursor`, { cwd: agents, stdio: "ignore" });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("unknown provider was accepted");

  console.log("\n✓ smoke passed");
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}
