# auditor extensions

This file is yours, and plugin updates never overwrite it. The playgentic agents pass these rules to the **auditor** agent on every run.

They're added to its built-in instructions, and **they override those instructions where the two conflict, including the guardrails.** Keep the rules short and concrete. Delete the examples you don't want.

## Rules

<!-- Examples:
- BLOCK any scenario without a `@smoke` or `@regression` tag.
- Treat missing `@mobile` coverage on checkout flows as a finding, not a blocker.
-->
