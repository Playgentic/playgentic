// Zero-dependency parser for page objects, feeding the page-object section of the
// wiki (`scripts/gen-wiki.mjs`).
//
// Reads every `*.ts` file under a pages directory and, for each exported class,
// extracts the class summary and its public members (methods, getters and
// readonly properties such as locators), each with the first line of its JSDoc.
//
// Like parse-steps.mjs this is regex-based on purpose: page objects in this suite
// follow a simple, regular shape, and it keeps the repo free of an AST dependency.
// Docstrings are optional here, and undocumented members are listed without a summary.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const CLASS_RE =
  /^export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+([\w.]+))?[^{]*\{/gm;

// A class member at the start of a line: optional modifiers, then a name followed
// by `(` (method/getter) or `:`/`=` (property). Private and #private are skipped.
const MEMBER_RE =
  /^[ \t]+((?:(?:public|protected|static|readonly|async|override|get|set)\s+)*)([A-Za-z_$][\w$]*)\s*(\(|[:=?!])/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** Index of the brace that closes the one opened at `openIdx`. */
function matchBrace(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return i;
  }
  return source.length;
}

/** Summary from the `/** *\/` block ending right before `idx`, or "". */
function docSummary(source, idx) {
  const before = source.slice(0, idx).replace(/\s+$/, "");
  if (!before.endsWith("*/")) return "";
  const open = before.lastIndexOf("/**");
  if (open === -1 || before.slice(open + 3, -2).includes("*/")) return "";
  const lines = before
    .slice(open + 3, -2)
    .split("\n")
    .map((l) => l.replace(/^\s*\*?\s?/, "").trim())
    .filter(Boolean);
  const tagged = lines.find((l) => l.startsWith("@description"));
  if (tagged) return tagged.replace(/^@description\s*/, "");
  return lines.find((l) => !l.startsWith("@")) ?? "";
}

const lineAt = (source, idx) => source.slice(0, idx).split("\n").length;

/** Extract every exported class and its public members from one source string. */
export function parsePageSource(source, file) {
  const pages = [];
  for (const m of source.matchAll(CLASS_RE)) {
    const openIdx = m.index + m[0].length - 1;
    const body = source.slice(openIdx + 1, matchBrace(source, openIdx));
    const bodyOffset = openIdx + 1;
    const members = [];
    let depth = 0;
    let offset = 0;
    for (const line of body.split("\n")) {
      const mm = depth === 0 ? line.match(MEMBER_RE) : null;
      if (mm && mm[2] !== "constructor" && !/\b(private|protected)\b/.test(mm[1])) {
        const modifiers = mm[1].trim().split(/\s+/).filter(Boolean);
        const kind = modifiers.includes("get") ? "getter" : mm[3] === "(" ? "method" : "property";
        members.push({
          name: mm[2],
          kind,
          async: modifiers.includes("async"),
          summary: docSummary(source, bodyOffset + offset),
        });
      }
      for (const ch of line) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      offset += line.length + 1;
    }
    pages.push({
      name: m[1],
      extends: m[2] ?? null,
      file,
      line: lineAt(source, m.index),
      summary: docSummary(source, m.index),
      members,
    });
  }
  return pages;
}

/** Parse every page object under `pagesDir` (relative to `root`). */
export function parsePages({ root = process.cwd(), pagesDir = "tests/pages" } = {}) {
  return walk(join(root, pagesDir))
    .sort()
    .flatMap((abs) => parsePageSource(readFileSync(abs, "utf8"), relative(root, abs)));
}
