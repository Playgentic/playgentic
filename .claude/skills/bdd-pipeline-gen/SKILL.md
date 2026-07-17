---
name: bdd-pipeline-gen
description: skill for extending or generating new test coverage within the suite
---
## Cardinal Rules

1) Only the explorer agent is allowed to launch the browser via mcp , everyone else must dispatch an explorer agent


## Overview

The workflow defined in this skill file will detail how agents contributing to the the project should extend existing test infra, build net new scenarios and coverage , and gather context for test writing within this project. 


## Workflow 

### 1. check your working branch 

```bash
git rev-parse --git-dir 
git branch --show-current
```
You should never run on main or master,  if you are currently on that branch offer to create a feature branch instead. 

### 2. load external material , if any

Some users will want you to load Jira tickets, Github issues, etc. You should load any issues they reference etc at this point so you have the info you need to build tests.  

### 3.  Plan test cases,  talk to the user about what they need coverage for and get clarity where neededc

Take this time to understand the buisness logic , the test scope , and the Acceptance Criteria needed for the test coverage the user is requesting. Ask questions over assuming , this is an important step to building intuitive tests

### 4. Scaffold test scenarios using as much existing architecture as possible
  Generate the wiki catalogue of test architecture using `npm run catalouge` so that its up to date.

  From here , you should explore the catalogue to understand what steps etc are avaialble , and strive to reuse as much as possible. DO NOT do a ton of random grepping through the codebase looking for test steps , start with the catalouge , if you need to see a specific one in there a bit more in depth then do so, but don't burn tokens on dumb exploration. 

### 5. Create the ephemeral working directory 
  create a new ephemeral workign directory in `.agent-sessions` 

  ```bash
    mkdir -p .agent-sessions/<YYYY-MM-DD-kebab-name>/
  ```
  ALL of your changes etc should be made here . 


  You should create these files to start