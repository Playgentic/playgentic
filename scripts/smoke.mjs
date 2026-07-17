// CI smoke test (not shipped — the package's `files` whitelist excludes scripts/).
// Scaffolds a suite into a temp dir, asserts the key files landed, and runs the
// zero-dependency gates straight from the scaffold (no npm install needed).

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "playgentic-smoke-"));
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

try {
  run(`node bin/cli.mjs init "${dir}" --no-install`);

  const required = [
    "playwright.config.ts",
    "tests/baseTest.ts",
    "tests/steps/example.steps.ts",
    "scripts/gen-wiki.mjs",
    ".claude/skills/bdd-pipeline/SKILL.md",
    ".claude/agents/bdd-explorer.md",
    ".claude/rules/code-styles.md",
    ".gitignore",
    "package.json",
  ];
  for (const f of required) {
    if (!existsSync(join(dir, f))) throw new Error(`scaffold missing file: ${f}`);
  }

  // These run on plain node — prove the template's tooling is coherent.
  run("node scripts/gen-wiki.mjs", dir);
  run("node scripts/lint-steps.mjs", dir);
  if (!existsSync(join(dir, "docs/index.md"))) {
    throw new Error("wiki did not generate docs/index.md");
  }

  console.log("\n✓ smoke passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
