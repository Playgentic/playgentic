# builder extensions

This file is yours, and plugin updates never overwrite it. The playgentic agents pass these rules to the **builder** agent on every run.

They're added to its built-in instructions, and **they override those instructions where the two conflict, including the guardrails.** Keep the rules short and concrete. Delete the examples you don't want.

## Rules

<!-- Examples:
- New page objects go in `tests/pages/<area>/`, one file per screen.
- Use `expect.soft` for multi-field form assertions.
- `waitForTimeout(500)` is allowed after the legacy date picker opens; it has no stable signal.
-->
