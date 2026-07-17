#!/usr/bin/env node
// playgentic — scaffold agentic Playwright-BDD suites and keep the Claude Code
// agent definitions in sync. Zero runtime dependencies (Node built-ins only).
//
//   playgentic init [dir] [--no-install]   scaffold a new suite (or add to an existing project)
//   playgentic sync [--dry]                pull the latest agent definitions into .claude/
//   playgentic --version | --help

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(PKG_ROOT, "template");
const ASSETS_CLAUDE = join(PKG_ROOT, "assets", "claude");

const version = () =>
  JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8")).version;

function die(msg) {
  console.error(`playgentic: ${msg}`);
  process.exit(1);
}

/** Recursively list file paths under `dir`, relative to it. */
function listFiles(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
}

// ---------------------------------------------------------------- init

function init(args) {
  const target = resolve(args.positionals[0] ?? ".");
  if (
    existsSync(join(target, "playwright.config.ts")) ||
    existsSync(join(target, "playwright.config.js"))
  ) {
    die(
      `${target} already looks like a Playwright project. Use \`playgentic sync\` to update agents instead.`,
    );
  }
  mkdirSync(target, { recursive: true });
  const hadPackageJson = existsSync(join(target, "package.json"));

  // Copy the whole template except package.json (merged/written below).
  cpSync(TEMPLATE_DIR, target, {
    recursive: true,
    filter: (src) => basename(src) !== "package.json",
  });

  // `gitignore` ships dotless so npm won't special-case it; restore the dot.
  const shipped = join(target, "gitignore");
  if (existsSync(shipped)) {
    const dotted = join(target, ".gitignore");
    if (existsSync(dotted)) rmSync(shipped);
    else renameSync(shipped, dotted);
  }

  // Layer the managed agent assets into .claude/ (alongside the template's settings).
  cpSync(ASSETS_CLAUDE, join(target, ".claude"), { recursive: true });

  writePackageJson(target, hadPackageJson);

  console.log(`\nScaffolded playgentic suite into ${target}`);

  if (!existsSync(join(target, ".git"))) {
    try {
      execSync("git init -q", { cwd: target });
    } catch {
      /* husky setup will just warn if git is unavailable */
    }
  }
  if (!args.values["no-install"]) {
    console.log("Installing dependencies...");
    execSync("npm install", { cwd: target, stdio: "inherit" });
  }

  printNextSteps(args.positionals[0] ?? ".", args.values["no-install"]);
}

function writePackageJson(target, hadPackageJson) {
  const template = JSON.parse(
    readFileSync(join(TEMPLATE_DIR, "package.json"), "utf8"),
  );
  const dest = join(target, "package.json");

  if (!hadPackageJson) {
    template.name = basename(target);
    writeFileSync(dest, JSON.stringify(template, null, 2) + "\n");
    return;
  }

  // Existing project: merge our scripts + devDeps in, never clobbering theirs.
  const proj = JSON.parse(readFileSync(dest, "utf8"));
  proj.scripts ??= {};
  proj.devDependencies ??= {};
  for (const [key, val] of Object.entries(template.scripts)) {
    if (proj.scripts[key] && proj.scripts[key] !== val)
      console.warn(`  ! kept your "${key}" script (playgentic uses: ${val})`);
    else proj.scripts[key] = val;
  }
  for (const [key, val] of Object.entries(template.devDependencies)) {
    if (!proj.devDependencies[key]) proj.devDependencies[key] = val;
  }
  writeFileSync(dest, JSON.stringify(proj, null, 2) + "\n");
  console.log("  merged playgentic scripts + devDependencies into your package.json");
}

function printNextSteps(dir, noInstall) {
  const lines = [
    "",
    "Next steps:",
    ...(dir === "." ? [] : [`  cd ${dir}`]),
    "  cp .env.example .env      # set TARGET_URL to your app",
    ...(noInstall ? ["  npm install"] : []),
    "  npx playwright install    # browsers",
    "  npm run wiki              # generate the step wiki",
    "  npm test                  # run the example scenario",
    "",
    "Update agent definitions later with:  npx playgentic sync",
    "",
  ];
  console.log(lines.join("\n"));
}

// ---------------------------------------------------------------- sync

function sync(args) {
  const cwd = process.cwd();
  if (!existsSync(join(cwd, ".claude"))) {
    die("no .claude/ here — run from a playgentic project root, or scaffold with `playgentic init`.");
  }
  const dry = Boolean(args.values.dry);
  let changed = 0;

  // Fully managed — always overwrite to the shipped version.
  for (const sub of ["skills", "agents"]) {
    changed += syncDir(join(ASSETS_CLAUDE, sub), join(cwd, ".claude", sub), true, dry);
  }
  // Rules are yours to edit (e.g. code-styles.md) — only add missing files, never overwrite.
  changed += syncDir(join(ASSETS_CLAUDE, "rules"), join(cwd, ".claude", "rules"), false, dry);

  if (changed === 0) {
    console.log(`Already up to date with playgentic v${version()}.`);
  } else if (dry) {
    console.log(`\n${changed} file(s) would change (playgentic v${version()}). Re-run without --dry to apply.`);
  } else {
    console.log(`\n✓ synced ${changed} file(s) from playgentic v${version()}.`);
  }
}

/** Copy managed files from srcDir into destDir; returns the count that changed. */
function syncDir(srcDir, destDir, overwrite, dry) {
  if (!existsSync(srcDir)) return 0;
  let changed = 0;
  for (const rel of listFiles(srcDir)) {
    const src = join(srcDir, rel);
    const dest = join(destDir, rel);
    const exists = existsSync(dest);
    if (exists && !overwrite) continue; // preserve user-owned file
    const next = readFileSync(src);
    if (exists && readFileSync(dest).equals(next)) continue; // identical
    changed++;
    console.log(`  ${dry ? "would " : ""}${exists ? "update" : "add"}: ${relative(process.cwd(), dest)}`);
    if (!dry) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, next);
    }
  }
  return changed;
}

// ---------------------------------------------------------------- cli

function printHelp() {
  console.log(`playgentic v${version()} — agentic Playwright-BDD scaffolder

Usage:
  playgentic init [dir] [--no-install]   Scaffold a suite into dir (default: .).
                                         Merges into an existing package.json.
  playgentic sync [--dry]                Update .claude/ agent definitions to this
                                         package's version. --dry previews changes.
  playgentic --version
  playgentic --help`);
}

function main() {
  const args = parseArgs({
    allowPositionals: true,
    options: {
      "no-install": { type: "boolean" },
      dry: { type: "boolean" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (args.values.version) return void console.log(version());
  const cmd = args.positionals[0];
  if (args.values.help || !cmd) return void printHelp();

  const rest = { values: args.values, positionals: args.positionals.slice(1) };
  if (cmd === "init") init(rest);
  else if (cmd === "sync") sync(rest);
  else die(`unknown command "${cmd}". Try: playgentic init | sync | --help`);
}

main();
