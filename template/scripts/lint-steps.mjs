// Enforces the step-docstring standard: every Given/When/Then must carry a
// compliant `/** @domain / @description / @prereq / @uses */` block. Wired into
// the husky pre-commit hook via `npm run lint:steps`. Exits non-zero on any
// violation so the commit is blocked.

import { parseSteps, REQUIRED_TAGS } from "./lib/parse-steps.mjs";

function main() {
  const steps = parseSteps({ root: process.cwd() });
  const violations = [];

  for (const step of steps) {
    const where = `${step.file}:${step.line}`;
    const label = `${step.keyword}("${step.pattern}")`;
    if (!step.hasDocstring) {
      violations.push(`${where} — ${label} is missing its /** */ docstring`);
      continue;
    }
    if (step.missingTags.length) {
      violations.push(
        `${where} — ${label} is missing or empty: ${step.missingTags
          .map((t) => `@${t}`)
          .join(", ")}`,
      );
    }
  }

  if (violations.length) {
    console.error(`\n✖ step docstring lint failed (${violations.length} violation(s)):\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error(
      `\nEvery step definition needs a docstring with: ${REQUIRED_TAGS.map((t) => `@${t}`).join(
        ", ",
      )}.`,
    );
    console.error("See tests/steps/example.steps.ts for the convention.\n");
    process.exit(1);
  }

  console.log(`✓ step docstring lint passed (${steps.length} steps).`);
}

main();
