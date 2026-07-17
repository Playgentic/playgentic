// Zero-dependency parser for BDD step definitions and their JSDoc docstrings.
//
// Shared by `scripts/gen-wiki.mjs` (the step wiki) and `scripts/lint-steps.mjs`
// (the pre-commit docstring gate). It reads every `*.steps.ts` file under a steps
// directory and, for each `Given|When|Then("<text>", ...)` call, extracts the
// `/** @domain / @description / @prereq / @uses */` block that immediately precedes it.
//
// The convention lives in tests/steps/example.steps.ts. Parsing is regex-based on
// purpose: the convention is simple and regular, and this keeps the repo free of a
// TypeScript/AST dependency.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Tags every compliant step docstring must declare. */
export const REQUIRED_TAGS = ["domain", "description", "prereq", "uses"];

/** Tags whose value must be non-empty (the rest may use the `none` sentinel). */
export const NON_EMPTY_TAGS = ["domain", "description"];

// Matches a top-level Given/When/Then call and captures its first string literal
// (the step pattern). The lookbehind rejects `.Given(` and identifiers like `MyGiven(`.
const STEP_RE = /(?<![\w.])(Given|When|Then)\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;

/** Recursively collect files under `dir` matching `predicate(path)`. */
function walk(dir, predicate, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // dir doesn't exist — return what we have
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

/** 1-based line number of `index` within `source`. */
function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === "\n") line++;
  return line;
}

/**
 * If the text immediately before `beforeIndex` is a `/** ... *\/` JSDoc block
 * (only whitespace between it and the step call), return the block's inner body;
 * otherwise return null.
 */
function precedingDocstring(source, beforeIndex) {
  const before = source.slice(0, beforeIndex).replace(/\s+$/, "");
  if (!before.endsWith("*/")) return null;
  const closeIdx = before.length - 2;
  const openIdx = before.lastIndexOf("/**", closeIdx);
  if (openIdx === -1) return null;
  // Reject `/*` (non-JSDoc) blocks: there must be no earlier `*/` between open and close.
  const between = before.slice(openIdx + 3, closeIdx);
  if (between.includes("*/")) return null;
  return between;
}

/** Parse `@tag value` lines out of a JSDoc body into a { tag: value } map. */
function parseTags(body) {
  const tags = {};
  for (const raw of body.split("\n")) {
    const line = raw.replace(/^\s*\*?\s?/, ""); // strip leading ` * `
    const m = line.match(/^@(\w+)\s*(.*)$/);
    if (m && !(m[1] in tags)) tags[m[1]] = m[2].trim();
  }
  return tags;
}

/** Extract every step definition from a single source string. */
export function parseStepSource(source, file) {
  const steps = [];
  for (const m of source.matchAll(STEP_RE)) {
    const body = precedingDocstring(source, m.index);
    const tags = body ? parseTags(body) : {};
    const usesRaw = tags.uses ?? "";
    const missingTags = REQUIRED_TAGS.filter((t) => {
      if (!(t in tags)) return true;
      if (NON_EMPTY_TAGS.includes(t) && tags[t] === "") return true;
      return false;
    });
    steps.push({
      file,
      line: lineAt(source, m.index),
      keyword: m[1],
      pattern: m[3],
      hasDocstring: body !== null,
      domain: tags.domain ?? "",
      description: tags.description ?? "",
      prereq: tags.prereq ?? "",
      uses:
        usesRaw && usesRaw.toLowerCase() !== "none"
          ? usesRaw
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean)
          : [],
      missingTags,
    });
  }
  return steps;
}

/**
 * Parse every `*.steps.ts` file under `stepsDir` (relative to `root`).
 * Returns a flat array of step records with `file` paths relative to `root`.
 */
export function parseSteps({ root = process.cwd(), stepsDir = "tests/steps" } = {}) {
  const base = join(root, stepsDir);
  const files = walk(base, (p) => p.endsWith(".steps.ts")).sort();
  const steps = [];
  for (const abs of files) {
    if (!statSync(abs).isFile()) continue;
    const source = readFileSync(abs, "utf8");
    steps.push(...parseStepSource(source, relative(root, abs)));
  }
  return steps;
}
