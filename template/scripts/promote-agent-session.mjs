// Promotes an ephemeral agent session's `tests/` back into prod `tests/`.
// Run ONLY at the end of the pipeline, after the user approves the work:
//
//   node scripts/promote-agent-session.mjs <session-name>
//
// It refuses to promote steps that violate the docstring standard (pre-flight,
// before any prod file is touched), copies the session's `tests/**` over prod
// (overwriting extended files, adding new ones), then regenerates the wiki and
// runs typecheck as post-checks.

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseSteps, REQUIRED_TAGS } from "./lib/parse-steps.mjs";

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function lintSession(sessionDir) {
  const steps = parseSteps({ root: sessionDir });
  const violations = [];
  for (const step of steps) {
    const where = `${step.file}:${step.line}`;
    if (!step.hasDocstring) violations.push(`${where} — missing docstring`);
    else if (step.missingTags.length)
      violations.push(
        `${where} — missing/empty ${step.missingTags.map((t) => `@${t}`).join(", ")}`,
      );
  }
  if (violations.length) {
    console.error(`✖ refusing to promote — ${violations.length} step docstring violation(s):\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error(`\nEvery step needs: ${REQUIRED_TAGS.map((t) => `@${t}`).join(", ")}.`);
    process.exit(1);
  }
}

function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("usage: node scripts/promote-agent-session.mjs <session-name>");
    process.exit(1);
  }
  const sessionDir = join(ROOT, ".agent-sessions", name);
  const sessionTests = join(sessionDir, "tests");
  if (!existsSync(sessionTests)) {
    console.error(`✖ no tests/ found in session: .agent-sessions/${name}`);
    process.exit(1);
  }

  // Pre-flight: enforce the docstring standard before mutating prod.
  lintSession(sessionDir);

  const added = [];
  const overwritten = [];
  for (const src of walk(sessionTests)) {
    const rel = relative(sessionDir, src); // e.g. tests/steps/foo.steps.ts
    const dest = join(ROOT, rel);
    (existsSync(dest) ? overwritten : added).push(rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }

  console.log(`promoted .agent-sessions/${name} → prod tests/`);
  for (const f of added) console.log(`  + ${f}`);
  for (const f of overwritten) console.log(`  ~ ${f}`);

  // Post-checks. Wiki must reflect the new steps; typecheck is advisory.
  console.log("\nregenerating wiki...");
  execSync("npm run wiki", { cwd: ROOT, stdio: "inherit" });
  try {
    console.log("typechecking...");
    execSync("npm run typecheck", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.error(
      "\n⚠ typecheck failed after promotion — fix the promoted files before committing.",
    );
    process.exit(1);
  }

  console.log(`\n✓ done. Review the diff, then clean up with: rm -rf .agent-sessions/${name}`);
}

main();
