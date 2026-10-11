#!/usr/bin/env node
// Release steps for the playgentic npm package. Zero dependencies, not shipped
// (scripts/ is outside the package's `files` whitelist).
// `bump` is run locally by the /release skill before tagging; `current` and
// `notes` are run by .github/workflows/release.yml when the tag is pushed.
//
//   node scripts/release.mjs current         print package.json's version
//   node scripts/release.mjs bump <x.y.z>    set package.json's version and move
//                                            CHANGELOG [Unreleased] under [x.y.z] - today
//   node scripts/release.mjs notes <x.y.z>   print that version's CHANGELOG section

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "package.json");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const REPO_URL = "https://github.com/playgentic/playgentic";

const die = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};
const esc = (v) => v.replaceAll(".", "\\.");

function assertSemver(v) {
  if (!/^\d+\.\d+\.\d+$/.test(v ?? "")) die(`expected a version like 1.2.3, got "${v ?? ""}"`);
}

const current = () => JSON.parse(readFileSync(PKG, "utf8")).version;

function bump(v) {
  assertSemver(v);
  const from = current();
  const text = readFileSync(CHANGELOG, "utf8");
  if (new RegExp(`^## \\[${esc(v)}\\]`, "m").test(text)) die(`CHANGELOG already has a [${v}] section`);

  const m = text.match(/^## \[Unreleased\]\n([\s\S]*?)(?=^## \[)/m);
  if (!m) die("CHANGELOG has no [Unreleased] section followed by a release");
  if (!m[1].trim() || m[1].trim() === "_Nothing yet._") die("CHANGELOG [Unreleased] is empty — record the changes before releasing");

  // Edit package.json textually so its formatting is preserved exactly.
  const pkgText = readFileSync(PKG, "utf8");
  const nextPkg = pkgText.replace(/("version"\s*:\s*")[^"]+(")/, `$1${v}$2`);
  if (nextPkg === pkgText) die("could not find \"version\" in package.json");
  writeFileSync(PKG, nextPkg);

  const today = new Date().toISOString().slice(0, 10);
  let next = text.replace(m[0], `## [Unreleased]\n\n_Nothing yet._\n\n## [${v}] - ${today}\n${m[1].replace(/^\n*/, "\n")}`);
  // Keep the compare links at the bottom current.
  next = next.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${REPO_URL}/compare/v${v}...HEAD`);
  if (!new RegExp(`^\\[${esc(v)}\\]: `, "m").test(next)) {
    next = next.replace(/^(\[Unreleased\]: .*)$/m, `$1\n[${v}]: ${REPO_URL}/compare/v${from}...v${v}`);
  }
  writeFileSync(CHANGELOG, next);
  console.log(`bumped ${from} → ${v} in package.json and CHANGELOG`);
}

function notes(v) {
  assertSemver(v);
  const text = readFileSync(CHANGELOG, "utf8");
  const m = text.match(new RegExp(`^## \\[${esc(v)}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|^\\[[^\\]]+\\]: |(?![\\s\\S]))`, "m"));
  if (!m || !m[1].trim()) die(`no CHANGELOG section for [${v}]`);
  process.stdout.write(m[1].trim() + "\n");
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "current") console.log(current());
else if (cmd === "bump") bump(arg);
else if (cmd === "notes") notes(arg);
else die("usage: release.mjs current | bump <x.y.z> | notes <x.y.z>");
