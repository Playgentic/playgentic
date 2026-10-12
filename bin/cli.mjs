#!/usr/bin/env node
// playgentic — scaffold an opinionated Playwright-BDD suite, and optionally wire the
// playgentic agents plugin for Claude Code, GitHub Copilot and/or Codex.
// Zero runtime dependencies (Node built-ins only).
//
//   playgentic init [dir] [--no-install] [--no-editor] [--agents <list>] [--agents-ref <ref>]
//   playgentic agents <list> [--agents-ref <ref>]   wire agents into an existing project
//   playgentic --version | --help

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PROVIDERS, parseProviders, setupAgents } from "./agents.mjs";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(PKG_ROOT, "template");

const version = () =>
  JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8")).version;

function die(msg) {
  console.error(`playgentic: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------- init

function init(args) {
  const target = resolve(args.positionals[0] ?? ".");
  if (
    existsSync(join(target, "playwright.config.ts")) ||
    existsSync(join(target, "playwright.config.js"))
  ) {
    die(
      `${target} already looks like a Playwright project. To add agents to it, run \`playgentic agents <${PROVIDERS.join("|")}>\` there.`,
    );
  }
  mkdirSync(target, { recursive: true });
  const hadPackageJson = existsSync(join(target, "package.json"));

  // Copy the whole template except package.json and .vscode/ (both merged/written below).
  const EDITOR_DIR = join(TEMPLATE_DIR, ".vscode");
  cpSync(TEMPLATE_DIR, target, {
    recursive: true,
    filter: (src) => basename(src) !== "package.json" && src !== EDITOR_DIR,
  });

  // `gitignore` ships dotless so npm won't special-case it; restore the dot.
  const shipped = join(target, "gitignore");
  if (existsSync(shipped)) {
    const dotted = join(target, ".gitignore");
    if (existsSync(dotted)) rmSync(shipped);
    else renameSync(shipped, dotted);
  }

  writePackageJson(target, hadPackageJson);
  if (!args.values["no-editor"]) writeEditorConfig(target);

  console.log(`\nScaffolded playgentic suite into ${target}`);

  if (!existsSync(join(target, ".git"))) {
    try {
      execSync("git init -q", { cwd: target });
    } catch {
      /* husky setup will just warn if git is unavailable */
    }
  }

  // After git init, so the config picks up the real default branch.
  const followUps = args.agents ? wireAgents(target, args.agents, args.values["agents-ref"]) : [];

  if (!args.values["no-install"]) {
    console.log("Installing dependencies...");
    execSync("npm install", { cwd: target, stdio: "inherit" });
  }

  printNextSteps(args.positionals[0] ?? ".", args.values["no-install"], followUps);
}

function wireAgents(target, providers, ref) {
  console.log(`\nWiring playgentic agents for: ${providers.join(", ")}`);
  return setupAgents(target, providers, { ref });
}

// ---------------------------------------------------------------- agents

function agents(args) {
  const list = args.positionals[0];
  if (!list) die(`usage: playgentic agents <${PROVIDERS.join(",")}|all> [--agents-ref <ref>]`);
  const followUps = wireAgents(process.cwd(), parseProviders(list), args.values["agents-ref"]);
  printFollowUps(followUps);
}

function printFollowUps(followUps) {
  if (!followUps.length) return;
  console.log(["", "To finish enabling the agents:", ...followUps.map((l) => `  ${l}`), ""].join("\n"));
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

// VS Code + the official Cucumber extension: point it at the features and step glue so
// steps resolve (go-to-definition, no "undefined step" squiggles). Merge-only, like the
// agent wiring: an existing key or recommendation is never overwritten.
function writeEditorConfig(target) {
  const dir = join(target, ".vscode");
  mkdirSync(dir, { recursive: true });

  const merge = (file, apply) => {
    const ours = JSON.parse(readFileSync(join(TEMPLATE_DIR, ".vscode", file), "utf8"));
    const dest = join(dir, file);
    let theirs = {};
    if (existsSync(dest)) {
      try {
        theirs = JSON.parse(readFileSync(dest, "utf8"));
      } catch {
        // VS Code allows comments (JSONC); rather than risk rewriting it, leave it alone.
        console.warn(`  ! left .vscode/${file} untouched (not plain JSON); see the template for the Cucumber keys`);
        return;
      }
    }
    writeFileSync(dest, JSON.stringify(apply(theirs, ours), null, 2) + "\n");
  };

  merge("settings.json", (theirs, ours) => {
    for (const [key, val] of Object.entries(ours)) {
      if (key === "files.associations") theirs[key] = { ...val, ...theirs[key] };
      else theirs[key] ??= val;
    }
    return theirs;
  });
  merge("extensions.json", (theirs, ours) => {
    const recs = theirs.recommendations ?? [];
    for (const r of ours.recommendations) if (!recs.includes(r)) recs.push(r);
    return { ...theirs, recommendations: recs };
  });
}

function printNextSteps(dir, noInstall, followUps) {
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
    ...(followUps.length ? [] : [`Add the agent harness any time with:  npx playgentic agents <${PROVIDERS.join(",")}>`, ""]),
  ];
  console.log(lines.join("\n"));
  printFollowUps(followUps);
}

// ---------------------------------------------------------------- cli

function printHelp() {
  console.log(`playgentic v${version()} — agentic Playwright-BDD scaffolder

Usage:
  playgentic init [dir] [--no-install] [--no-editor] [--agents <list>]
                         Scaffold a suite into dir (default: .). Merges into an
                         existing package.json. --agents also wires the agent
                         harness (same as running \`playgentic agents\` after).
                         --no-editor skips the VS Code Cucumber config in .vscode/.
  playgentic agents <list>
                         Wire the playgentic agents plugin into the current project.
                         <list> is comma-separated: ${PROVIDERS.join(", ")}, or all.
  Options:
    --agents-ref <ref>   Pin the agents marketplace to a git tag or branch.
  playgentic --version
  playgentic --help`);
}

function main() {
  const args = parseArgs({
    allowPositionals: true,
    options: {
      "no-install": { type: "boolean" },
      "no-editor": { type: "boolean" },
      agents: { type: "string" },
      "agents-ref": { type: "string" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (args.values.version) return void console.log(version());
  const cmd = args.positionals[0];
  if (args.values.help || !cmd) return void printHelp();

  const rest = { values: args.values, positionals: args.positionals.slice(1) };
  try {
    if (args.values.agents !== undefined) rest.agents = parseProviders(args.values.agents);
  } catch (err) {
    die(err.message);
  }
  if (cmd === "init") init(rest);
  else if (cmd === "agents") agents(rest);
  else die(`unknown command "${cmd}". Try: playgentic init | agents | --help`);
}

main();
