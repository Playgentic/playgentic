# author-tests extensions

This file is yours, and plugin updates never overwrite it. The playgentic agents pass these rules to the **author-tests** skill (the orchestrator) on every run.

They're added to its built-in instructions, and **they override those instructions where the two conflict, including the guardrails.** Keep the rules short and concrete. Delete the examples you don't want.

## Rules

<!-- Examples:
- Always use a worktree, even for sequential work.
- Acceptance criteria must reference the Jira ticket id, e.g. "AC-1 (QA-123)".
- Strip `@AC-n` tags at hand-off; we tag with `@QA-123` instead.
- Run `npm run wiki` before committing.
-->
