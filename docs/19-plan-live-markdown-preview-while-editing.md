# Plan: Live Markdown Preview While Editing

## Context
The Docs module edit mode currently shows only a plain monospace textarea. Users must save and exit edit mode to see rendered markdown. This makes it hard to write well-formatted documents without repeatedly toggling modes.

The goal is to show a live rendered preview alongside the textarea while editing, so the user can see what their markdown looks like as they type.

## Approach: Split-Pane Editor

When `isEditing` is true, replace the single textarea with a two-column layout:
- **Left pane (50%):** existing textarea (unchanged)
- **Right pane (50%):** live ReactMarkdown preview using the `content` state, re-renders on every keystroke

The preview panel reuses the exact same `ReactMarkdown` + `PreBlock` + `InlineCode` + `MermaidBlock` stack already present in view mode � no new dependencies.

The outer container widens from `max-w-3xl` to `max-w-6xl` while editing to give both panes enough room.

## Critical File

- `app/components/DocDetail.tsx` � only file changed

## Changes

### 1. Widen container in edit mode (line 129)
Dynamic width: `max-w-6xl` in edit mode, `max-w-3xl` in view mode.

### 2. Replace textarea-only block with split pane
`grid grid-cols-2 gap-4` layout: textarea left, live preview right. Preview uses identical prose classes and component overrides as view mode. Empty content shows placeholder text.

## Verification
1. Open any doc ? click Edit
2. Container widens to `max-w-6xl`
3. Left: textarea, right: live preview updating as you type
4. Code blocks, tables, mermaid diagrams, inline code all render correctly in preview
5. Save ? view mode renders identically to the preview
6. Empty textarea shows placeholder