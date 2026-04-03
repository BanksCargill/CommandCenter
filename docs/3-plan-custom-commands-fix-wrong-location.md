# Custom Commands — Fix Wrong Location

## Context

The custom slash commands `/new-module` and `/sync-projects` were created at:
```
CommandCenter/command-center/.claude/commands/
```

Claude Code's working directory (the VS Code workspace root) is:
```
c:\Repositories\testing\ClaudeProjects
```

Claude Code resolves `.claude/commands/` relative to its working directory, so it looked for:
```
c:\Repositories\testing\ClaudeProjects\.claude\commands\   ← doesn't exist
```

and never found the commands nested inside the subdirectory.

---

## Fix

### Step 1 — Create workspace-level `.claude/commands/`
Create the directory at the correct location:
```
c:\Repositories\testing\ClaudeProjects\.claude\commands\
```

### Step 2 — Write commands there with proper frontmatter
Claude Code's command palette uses the `description` frontmatter field to surface commands — add it to both files.

**`new-module.md`** at workspace-level `.claude/commands/`:
```markdown
---
description: Scaffold a new Command Center module end-to-end
---
[same body content as existing file]
```

**`sync-projects.md`** at workspace-level `.claude/commands/`:
```markdown
---
description: Sync the Command Center project board and CLAUDE.md with the codebase
---
[same body content as existing file]
```

### Step 3 — Delete the misplaced copies
Remove:
```
CommandCenter/command-center/.claude/commands/new-module.md
CommandCenter/command-center/.claude/commands/sync-projects.md
CommandCenter/command-center/.claude/commands/   ← directory
CommandCenter/command-center/.claude/            ← directory (if now empty)
```

### Step 4 — Add workspace-level CLAUDE.md (optional but useful)
The project CLAUDE.md lives at `CommandCenter/command-center/CLAUDE.md`. Claude Code picks up CLAUDE.md files by walking up from the working directory, so it currently finds nothing at the workspace root. A minimal workspace CLAUDE.md at `c:\Repositories\testing\ClaudeProjects\CLAUDE.md` acts as a pointer:

```markdown
# ClaudeProjects Workspace

The active project is **Command Center** at `CommandCenter/command-center/`.

Read `CommandCenter/command-center/CLAUDE.md` for full project context before starting work.
```

---

## Files to create
- `c:\Repositories\testing\ClaudeProjects\.claude\commands\new-module.md`
- `c:\Repositories\testing\ClaudeProjects\.claude\commands\sync-projects.md`
- `c:\Repositories\testing\ClaudeProjects\CLAUDE.md`

## Files to delete
- `CommandCenter\command-center\.claude\commands\new-module.md`
- `CommandCenter\command-center\.claude\commands\sync-projects.md`
- `CommandCenter\command-center\.claude\` (empty directory)

---

## Verification
1. In a new thread, type `/` — `/new-module` and `/sync-projects` should appear in the command palette
2. Type `/new-module` — should prompt for module name and begin the checklist
3. Type `/sync-projects` — should read CLAUDE.md and audit project tasks
