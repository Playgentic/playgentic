// Bootstraps an ephemeral agent working directory under `.agent-sessions/`.
// Agents do ALL of their editing here and never touch prod `tests/`; the
// `agent-session` Playwright project (see playwright.config.ts) runs against it
// when AGENT_SESSION points at the created folder.
//
//   node scripts/new-agent-session.mjs <name> [--extend <tests/path> ...]
//
// It mirrors the prod `tests/` layout, always copies `tests/baseTest.ts` (so the
// steps' `"../baseTest"` import resolves), and copies any `--extend` files so an
// existing step/feature file can be extended in isolation before promotion.

import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();

function kebab(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArgs(argv) {
  const extend = [];
  let name;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--extend") extend.push(argv[++i]);
    else if (!name) name = argv[i];
  }
  return { name, extend };
}

function copyInto(sessionDir, relPath) {
  if (!relPath.startsWith("tests/")) {
    console.error(`  ✖ --extend paths must live under tests/: ${relPath}`);
    process.exit(1);
  }
  const src = join(ROOT, relPath);
  if (!existsSync(src) || !statSync(src).isFile()) {
    console.error(`  ✖ --extend file not found: ${relPath}`);
    process.exit(1);
  }
  const dest = join(sessionDir, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  extended: ${relPath}`);
}

function main() {
  const { name, extend } = parseArgs(process.argv.slice(2));
  if (!name) {
    console.error("usage: node scripts/new-agent-session.mjs <name> [--extend <tests/path> ...]");
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const sessionName = `${date}-${kebab(name)}`;
  const sessionDir = join(ROOT, ".agent-sessions", sessionName);

  if (existsSync(sessionDir)) {
    console.error(`✖ session already exists: .agent-sessions/${sessionName}`);
    process.exit(1);
  }

  mkdirSync(join(sessionDir, "tests", "features"), { recursive: true });
  mkdirSync(join(sessionDir, "tests", "steps"), { recursive: true });
  copyFileSync(join(ROOT, "tests", "baseTest.ts"), join(sessionDir, "tests", "baseTest.ts"));
  console.log(`created session .agent-sessions/${sessionName} (copied tests/baseTest.ts)`);

  for (const relPath of extend) copyInto(sessionDir, relPath);

  console.log(`\nSession name: ${sessionName}`);
  console.log("Run its tests with:");
  console.log(`  AGENT_SESSION=${sessionName} npm run test:agent`);
  console.log("Promote it into prod when approved with:");
  console.log(`  npm run agent:promote ${sessionName}`);
}

main();
