# playgentic — agent design

How the agent pipeline is put together, and why. This is the design doc for the pipeline that
ships in every scaffolded suite (`.claude/`). If you just want to *use* it, the scaffold's own
README is enough — this is for understanding and extending it.

## Design principles

| Principle | How it shows up |
| --- | --- |
| **Never touch prod on the way** | agents work only inside an ephemeral `.agent-sessions/<id>/` copy; `tests/` changes land only via an explicit promotion step |
| **Human gate at the end** | nothing merges without you running `agent:promote` after review |
| **Reuse before writing** | the orchestrator regenerates + reads the step wiki first, so new work reuses existing steps |
| **One tool touches the browser** | only the `bdd-explorer` subagent drives the `playwright-test` MCP; everyone else delegates |
| **Adversarial review** | a separate `bdd-auditor` challenges assertion strength and coverage before promotion |
| **Update agents in one place** | agent definitions live in the package and are pulled per-project via `playgentic sync` |

## Components

```mermaid
flowchart TB
  subgraph cc["Claude Code"]
    ORC["Orchestrator<br/><i>skill: /bdd-pipeline --gen / --heal</i>"]
    EXP["bdd-explorer<br/><i>subagent · builds/heals steps</i>"]
    AUD["bdd-auditor<br/><i>subagent · adversarial review</i>"]
  end

  subgraph repo["Your repo"]
    WIKI["Step wiki<br/><code>docs/</code>"]
    PROD["Prod suite<br/><code>tests/</code>"]
    SESS["Ephemeral session<br/><code>.agent-sessions/&lt;id&gt;/</code>"]
    RUN["agent-session runner<br/><i>Playwright project</i>"]
    AUDIT["<code>.claude/audits/</code>"]
  end

  MCP["playwright-test MCP<br/><i>real browser</i>"]
  APP["App under test<br/><code>TARGET_URL</code>"]

  ORC -->|"1 · read for reuse"| WIKI
  ORC -->|"2 · agent:new"| SESS
  ORC -->|"3 · scaffold PENDING stubs"| SESS
  ORC -->|"4 · dispatch"| EXP
  EXP -->|edits| SESS
  EXP -->|test_debug| RUN
  RUN -->|"AGENT_SESSION only"| SESS
  RUN --> MCP --> APP
  ORC -->|"5 · dispatch"| AUD
  AUD --> AUDIT
  ORC -->|"6 · agent:promote (on approval)"| PROD
```

## The generation loop

`/bdd-pipeline --gen` adds coverage. The orchestrator plans and scaffolds; the explorer does all
live-browser work; the auditor reviews; you approve.

```mermaid
sequenceDiagram
  participant U as You
  participant O as Orchestrator
  participant S as .agent-sessions
  participant E as bdd-explorer
  participant R as agent-session runner
  participant A as bdd-auditor

  U->>O: /bdd-pipeline --gen (+ prompt / ticket)
  O->>O: guard branch · plan cases · npm run wiki (reuse)
  O->>S: agent:new — copy baseTest, extend files
  O->>S: write .feature + step stubs (throw PENDING)
  O->>E: dispatch with session + test ids
  loop until green or 3 repeats
    E->>R: test_debug (AGENT_SESSION set)
    R-->>E: fails at PENDING / assertion
    E->>S: explore live app, fill in the step
  end
  E-->>O: summary + results.json (+ FAIL_REASON.md)
  O->>A: dispatch on changed files
  A-->>O: report → .claude/audits (BLOCK / MEETS / SHIP)
  O->>U: present results
  U->>O: approve
  O->>O: agent:promote → tests/ + regenerate wiki
```

### The explorer's stub loop

New steps are scaffolded as stubs that **throw** — the thrown `PENDING exploration` is the
explorer's signal to go look at the real app. It never guesses locators from stale artifacts;
every exploration is fresh.

```mermaid
stateDiagram-v2
  [*] --> RunTest: test_debug
  RunTest --> Explore: hits PENDING / failure
  Explore --> Patch: snapshot, locate, infer (live app)
  Patch --> RunTest: rerun
  RunTest --> Passing: step resolves
  RunTest --> Blocked: 3 fails at same step
  Blocked --> Document: write FAIL_REASON.md
  Passing --> [*]
  Document --> [*]
```

## Runner isolation

The agents run through a dedicated Playwright project, `agent-session`, that is **only defined
when `AGENT_SESSION` is set** and globs *only* that session's folder. Your real `desktop`/`mobile`
projects and CI never see it, and it can never resolve a file under prod `tests/`.

```mermaid
flowchart LR
  subgraph normal["npm test / CI  (AGENT_SESSION unset)"]
    P1[desktop] --> T1["tests/**"]
    P2[mobile] --> T1
  end
  subgraph agent["npm run test:agent  (AGENT_SESSION=&lt;id&gt;)"]
    P3[agent-session] --> T2[".agent-sessions/&lt;id&gt;/tests/**"]
  end
```

`agent:promote` is the *only* bridge from a session back to `tests/`: it lints the session's
docstrings, copies its `tests/**` over prod (extending existing files, adding new ones),
regenerates the wiki, and typechecks — aborting before it writes if anything fails.

## The healing loop

`/bdd-pipeline --heal` repairs broken/flaky tests. Same isolation, but it starts from an existing
failure and its priority is *not weakening the assertion to make it pass*.

```mermaid
flowchart LR
  F["failing test<br/>+ report/error"] --> C["agent:new --extend<br/>copy failing feature+steps"]
  C --> RP["reproduce in session"]
  RP --> EX["bdd-explorer<br/>re-explore live app, repair"]
  EX --> AU["bdd-auditor<br/>guard assertion strength"]
  AU --> PR{approve?}
  PR -- yes --> PROMO["agent:promote → tests/"]
  PR -- no --> EX
```

## Keeping agents current: the sync model

Agent definitions are versioned in the playgentic package and pulled into each project. Files
split into two buckets so updates never fight your customizations:

```mermaid
flowchart TB
  subgraph pkg["playgentic package"]
    M["assets/claude/skills, agents"]
    RUL["assets/claude/rules/code-styles.md"]
  end
  subgraph proj[".claude in your project"]
    PM["skills, agents<br/><b>managed</b>"]
    PR["rules/code-styles.md<br/><b>yours</b>"]
    PX["your own extra skills/agents<br/><b>yours</b>"]
  end
  M -- "sync: overwrite" --> PM
  RUL -. "sync: only if absent" .-> PR
  PX -. "sync: never touched" .-> PX
```

`playgentic sync` overwrites the **managed** skills/agents to the shipped version, but never
overwrites `code-styles.md` (your team's standards, which the auditor reads) or any skill/agent
you added. Editing a managed file means you've forked it — the next `sync` will overwrite it, by
design. (Richer drift/merge handling is intentionally deferred.)

## Extending the pipeline

- **Auditor standards** — `.claude/rules/code-styles.md` is where most of the auditor's judgement
  comes from. The more concrete it is, the sharper the reviews.
- **Add a subagent/skill** — drop it in `.claude/`; `sync` leaves anything you add alone.
- **Change the runner** — the `agent-session` project in `playwright.config.ts` is a normal
  Playwright project; adjust its device/globs as needed.
