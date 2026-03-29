# Skills

Agentis integrates with [skills.sh](https://skills.sh) — a registry of 90,000+ agent skills. Skills are markdown files that inject domain-specific knowledge into an agent's system prompt before it runs.

---

## What a Skill Does

A skill is a `SKILL.md` file hosted on GitHub. When assigned to an agent role, its contents are appended to that role's system prompt. This gives the agent specialized procedural knowledge — for example:

- A **Frontend Design** skill tells the Coder role to follow specific typography, color, and layout conventions
- A **Supabase/Postgres** skill tells it the exact RLS patterns, schema conventions, and query idioms
- A **Copywriting** skill gives the Writer role frameworks for persuasive writing

Skills are written by the community and published to `skills.sh`. They're not generated at runtime — they're pre-written expert knowledge files.

---

## Browsing Skills

1. Go to **Skills** in the sidebar
2. Search across 90,000+ skills from the skills.sh registry
3. Or browse curated picks in the default view

---

## Installing a Skill

1. Find a skill in the directory
2. Click **Install**
3. Agentis fetches the `SKILL.md` from GitHub and saves it locally (IndexedDB)

Installation happens once. The skill content is stored locally — no network calls during agent runs.

---

## Assigning a Skill to a Role

After installing, assign it to one or more agent roles:

1. Go to **Skills → Role Assignments** tab
2. Click a role (e.g., `coder`)
3. Toggle the skills you want active for that role

Multiple skills can be assigned to one role. All are injected in order.

---

## How Skills Are Injected

At runtime, when an agent role is activated:

```
[Base role system prompt]

---
# Specialized Skills Active

## Frontend Design
[full SKILL.md content]

---

## React Best Practices
[full SKILL.md content]
```

The agent has this full context before it processes your task.

---

## Curated Skills

These are pre-verified and recommended:

| Skill | Provider | Best for |
|---|---|---|
| Frontend Design | anthropics/skills | Coder, Writer |
| Claude API | anthropics/skills | Coder |
| MCP Builder | anthropics/skills | Coder, Planner |
| Web App Testing | anthropics/skills | Coder, Reviewer |
| React Best Practices | vercel-labs/agent-skills | Coder |
| Web Design Guidelines | vercel-labs/agent-skills | Coder, Writer |
| Supabase / Postgres | supabase/agent-skills | Coder |
| SEO Audit | coreyhaines31/marketingskills | Analyst, Researcher |
| Copywriting | coreyhaines31/marketingskills | Writer |
| Brainstorming | obra/superpowers | Planner, Analyst |

---

## Publishing Your Own Skill

1. Create a GitHub repository
2. Add a `SKILL.md` file with your instructions
3. Submit to [skills.sh](https://skills.sh) registry

Structure:

```markdown
# Skill Name

## Overview
What this skill does in 2-3 sentences.

## When to Apply
Conditions under which the agent should use this knowledge.

## Guidelines
Specific rules, patterns, and conventions to follow.

## Examples
Concrete examples of good vs bad outputs.
```

---

## Coming Soon

- **Skill versioning** — pin a specific commit of a skill, not just `main`
- **Skill composer** — combine multiple skills into a bundle and install as one
- **Private skills** — load skills from private GitHub repos using a personal access token
