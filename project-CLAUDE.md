# Agentis Integration

This project uses [Agentis](https://github.com/YOUR_USERNAME/agentis) for AI-assisted development.

## What is an Agentis job?

When Agentis completes a task, it exports an `agentis-job/` folder containing:

- `job.json` — job metadata, task description, skills used
- `CLAUDE.md` — specific instructions for this job
- `planner.md` — the Planner skill's breakdown and approach
- `architect.md` — the Architect skill's file structure and design
- `code/` — all generated code files ready to be placed
- `reviewer.md` — the Reviewer skill's notes and suggested improvements
- `documenter.md` — documentation written for the generated code
- `execute.sh` — one-command runner

## How to execute an Agentis job

When you see an `agentis-job/` folder in this repo, your job is to:

### Step 1 — Read the job
```
Read agentis-job/job.json to understand the task.
Read agentis-job/CLAUDE.md for specific instructions.
Read agentis-job/planner.md for the execution plan.
Read agentis-job/architect.md for file placement instructions.
```

### Step 2 — Place the files
```
Look at agentis-job/code/ for all generated files.
Place each file into the correct location as specified in architect.md.
If a file already exists, carefully merge — do not overwrite existing logic.
```

### Step 3 — Run and fix
```
Run the project's test suite.
If tests fail, read the errors carefully and fix them.
Check for TypeScript errors: npx tsc --noEmit
Fix any type errors found.
Run tests again to confirm they pass.
```

### Step 4 — Commit and PR
```
Stage all new and modified files.
Commit with message format: feat(agentis): <short description of what was built>
Push to a new branch named: agentis/<task-slug>
Open a pull request with:
  - Title: [Agentis] <task summary>
  - Body: paste the contents of agentis-job/documenter.md
```

### Step 5 — Clean up
```
Delete the agentis-job/ folder after the PR is opened.
Do not commit the agentis-job/ folder itself.
```

## Important rules

- **Do NOT re-plan or re-architect.** Agentis has already done that. Go straight to execution.
- **Do NOT ask for clarification** unless there is a genuine ambiguity that would cause data loss or breaking changes.
- **Do fix errors** — if the generated code has bugs, fix them. That is part of your job.
- **Respect existing conventions** — match the code style, naming patterns, and file structure already in this repo.
- **One PR per job** — each Agentis job should result in exactly one pull request.

## Project conventions

<!-- Fill this in for your project -->
- Language: TypeScript
- Test runner: (add yours — Jest / Vitest / etc.)
- Package manager: npm
- Branch naming: `agentis/<feature-name>`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)

## Running tests

```bash
# Add your test command here
npm test
```

## Checking types

```bash
npx tsc --noEmit
```
