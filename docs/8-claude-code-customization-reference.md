# Claude Code Customization Reference

A guide to the four mechanisms Claude Code provides for customizing and extending its behavior.

---

## 1. Skills (Slash Commands)

Skills are reusable, multi-step workflows stored as Markdown files and invoked with `/skill-name`. They are the right tool when you have a repeatable sequence of steps that would otherwise require manual direction.

### Locations

| Scope | Path | Available in |
|-------|------|--------------|
| Project | `.claude/commands/[name].md` | This project only |
| Global | `~/.claude/commands/[name].md` | All projects |

### File format

```markdown
---
description: One-line description shown in the skill picker
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite
---

Skill instructions go here. Claude follows these when the skill is invoked.
```

The `allowed-tools` frontmatter controls which tools Claude may use when running the skill. Omitting it allows all tools.

### Self-updating convention

Every skill in this project includes a final step to update itself if execution revealed a gap or new pattern. This keeps skills accurate without a separate maintenance pass.

### Skills in this project

| Skill | File | Purpose |
|-------|------|---------|
| `/new-module` | `.claude/commands/new-module.md` | Scaffold a new module end-to-end |
| `/sync-projects` | `.claude/commands/sync-projects.md` | Reconcile CLAUDE.md and the project board with the codebase |
| `/smoke-check` | `.claude/commands/smoke-check.md` | Hit every active API route and verify responses |

---

## 2. Memory

Memory files are Markdown documents that Claude reads at the start of a conversation to recall facts, preferences, and lessons learned. They are the right tool for persistent knowledge that should inform behavior across sessions.

### Location

Memory lives in a **project-scoped directory** based on the encoded working directory path:

```
~/.claude/projects/[encoded-project-path]/memory/
```

For this project the path is:

```
C:\Users\Banks Cargill\.claude\projects\c--Repositories-testing-ClaudeProjects-CommandCenter-command-center\memory\
```

The encoding rule: the absolute project path, lowercased, with all non-alphanumeric characters replaced by `-`.

An index file `MEMORY.md` in the same directory lists all memory files. Claude loads this index each conversation to decide which files are relevant to load.

### Memory types

| Type | Purpose | Examples |
|------|---------|---------|
| `user` | Who the user is — role, expertise, preferences | "Senior engineer, new to React" |
| `feedback` | How Claude should behave — corrections and confirmations | "Don't mock the DB in tests" |
| `project` | Ongoing work context — decisions, constraints, deadlines | "Auth rewrite driven by compliance" |
| `reference` | Where to find things in external systems | "Pipeline bugs tracked in Linear INGEST" |

### File format

```markdown
---
name: Memory name
description: One-line description — used to judge relevance when loading
type: user | feedback | project | reference
---

Memory content here. For feedback/project types, structure as:
Rule or fact.
**Why:** The reason behind it.
**How to apply:** When this guidance kicks in.
```

### Memory files in this project

| File | Type | Contents |
|------|------|---------|
| `user_profile.md` | user | Working style, values, tools |
| `project_decisions.md` | project | SQLite rationale, no auth, no global state, single project board |
| `feedback_conventions.md` | feedback | Self-updating systems, tool choice explanations, fast rendering fixes |
| `feedback_mermaid_markdown.md` | feedback | Mermaid v11 syntax rules, react-markdown v9 code renderer split |

---

## 3. Hooks

Hooks are shell commands that run automatically in response to Claude Code lifecycle events. They are the right tool for automated actions that should happen every time an event fires — without Claude needing to remember to do it.

### Configuration

Hooks live in `settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npm run lint" }
        ]
      }
    ]
  }
}
```

### Lifecycle events

| Event | Fires when |
|-------|-----------|
| `PreToolUse` | Before any tool executes |
| `PostToolUse` | After any tool executes |
| `Notification` | Claude sends a notification |
| `Stop` | Claude finishes a response |

The `matcher` field filters by tool name (supports `|` for OR, regex). Output from hooks is shown to Claude as additional context.

---

## 4. CLAUDE.md

`CLAUDE.md` files contain standing instructions that are always active — Claude reads them at the start of every session. They are the right tool for conventions, architecture rules, and maintenance responsibilities that apply to every task.

### Locations

| Scope | Path |
|-------|------|
| Project root | `CLAUDE.md` (this file's sibling) |
| Subdirectory | `app/CLAUDE.md`, `lib/CLAUDE.md`, etc. |
| Global | `~/.claude/CLAUDE.md` |

Subdirectory `CLAUDE.md` files are loaded when Claude touches files in that directory. Global applies everywhere.

---

## Choosing the right tool

| Situation | Use |
|-----------|-----|
| Multi-step workflow you run repeatedly | Skill |
| Fact or preference Claude should remember across sessions | Memory |
| Action that should happen automatically on every event | Hook |
| Convention or rule that applies to every task | CLAUDE.md |
| Repeated action Claude keeps forgetting | Feedback memory or Hook |

**When in doubt:** If it's something Claude should *do*, use a Skill or Hook. If it's something Claude should *know*, use Memory or CLAUDE.md.

---

## Flagging extractable patterns

During any session, Claude will flag when something could be extracted:
- A repeated workflow → suggest a **skill**
- A persistent fact or preference → suggest a **memory file**
- An automated action on a Claude event → suggest a **hook**

This guide should be updated whenever a new skill, memory type, or hook pattern is added to the project.
