---
name: bdd-pipeline
description: load the correct bdd skill workflow based on command flags
---

## Role

To orchestrate bdd pipeline workflows , you'll need to load the appropriate skill workflow based on the engineer's goal when invoking the skill. They will invoke this skill , then pass one of the following flags , as well as a prompt.

`--heal` : healer pipeline. This pipeline is used to heal existing tests. If this flag is passed , load the `bdd-pipeline-heal` skill. If you have trouble invoking it , it is in the `.claude/skills/bdd-pipeline-heal` file.

`--gen` : generation pipeline. This pipeline is used to generate greenfield coverage, or add new coverage extending existing tests. If this flag is passed , load the `bdd-pipeline-gen` skill. If you have trouble invoking it , it is in the `.claude/skills/bdd-pipeline-gen` file.

`--help`: if the user passes this flag, essentially just print a helpful overview of the above two options and what each skill can be used for (high level)