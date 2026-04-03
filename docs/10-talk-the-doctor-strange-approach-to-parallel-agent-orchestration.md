# The Doctor Strange Approach to Parallel Agent Orchestration

**Event:** RVATech Data Summit 2026

---

## Notes

Particular to development work
About: Works at Allianz Partners (Angular, react native, .NET)

###Context engineering tools
Claude code, Codex CLI, Gemini CLI

###Pocket
What is pocket how is it used
The per agent view looks powerful but slow - be nice to set them up and feed the same prompt once

###pocket manager
forked `tsk`
then uses docker to kick off the appropriate model
then pull the changed back via `tsk`

###Pockets as a way for enabling agent usage across org (non-dev)
###Agent teams
- Claude specific - similar to the creator of the "Mission Control" interface the command center is loosely based on

I see value in structure of agents where the orchestrator fires off to lowest level, they return to something like a Sr. Dev that is responsible for improving processes and the automation based on what the low level agents completed. Then that information along with the "final" result from the middle-layer is returned to the orchestrator. 

###Economy
- There are serious issues with the economy of agentification
- How can this be resolve without just throwing money at it
- 


## Key Takeaways
Agents

## Questions / Follow-ups

---

## AI Takeaways

- **The Doctor Strange analogy is the forking itself** — the live demo forked environments into three parallel design variants (tabs, accordions, side nav) and picked the winner, exactly like Strange viewing alternate timelines. This is the core metaphor, not just a branding choice.
- **Tsk is the underlying orchestration primitive** — Pocket Manager is a fork of `tsk`, using Docker to spin up isolated model environments and retrieve changes. This is the actual mechanism behind the demo.
- **Three-tier Agent Teams structure** — team lead (breaks work into chunks) → parallel developer agents (front end, back end, DB, each in isolated pockets) → integrator (consolidates results). Human sits above the team lead, not in the loop for every step.
- **Rewind-timeline / Time-Stone feature** — proposed as a future enhancement: snapshot the entire environment before every tool call to enable branching and rollback. Meaningful for anyone building dev-agent pipelines.
- **Observability infrastructure is a first-class pillar** — real-time monitoring of agent activity was positioned as a required component of environment engineering, not an afterthought.
- **Evolution framing: prompt → context → environment engineering** — the talk structured AI usage maturity in three stages; most teams are still at stage 1 or 2.

---

## AI Summary

### Overview

The talk framed AI agent development as a three-stage evolution: **prompt engineering → context engineering → environment engineering**. The speaker (from Allianz Partners) used live demos with multiple models to show what environment engineering looks like in practice.

---

### Core Concepts

**Context Engineering**
- Goes beyond prompt writing — curates the right knowledge, tools, and instructions for the model
- Tools like Codex CLI and GitHub Copilot operate at this layer
- Current limitation: approval fatigue and risk to Git history

**Environment Engineering**
- Isolated environments let agents use full developer tooling and spin up application stacks
- Three required pillars: isolated environments, observability infrastructure, board retrieval (e.g., Git)
- Observability allows real-time monitoring of what agents are actually doing

---

### Live Demo: Multi-Model Redesign

Three models competed on the same redesign prompt in parallel pockets: **Haiku, Sonnet, and Opus**. Audience voted — Opus won. Losing pockets were shut down; work continued from the winning state.

Then the winning environment was **forked** into three new pockets for design exploration (tabs, accordions, side nav) — this is the Doctor Strange / parallel timelines metaphor in action.

---

### Agent Teams Vision

| Role | Responsibility |
|------|---------------|
| Team Lead | Breaks work into parallelizable chunks; escalation target |
| Developer Agents | Front end, back end, DB — each in an isolated pocket |
| Integrator | Consolidates agent output into a working solution |
| Human | Sits above team lead; sets goals, reviews final output |

---

### Proposed Future Enhancements

- **Rewind timeline** — snapshot environment before every tool call; enables branching, rollback, and agent-initiated rewinds
- **Environment self-improvement agents** — agents that can modify their own workspace configs, request rebuilds, and resume with updated environments
- **Cloud scaling** — horizontal growth beyond a single machine for complex parallel workloads

---

### Transcript & Resources

- Transcript: https://otter.ai/u/qo1-nXPAZIus4vbeMrZxw86QkrA

---

### Action Items

- [ ] Design and implement a rewind-timeline feature (snapshot environment before every tool call)
- [ ] Develop environment self-improvement agents that can modify workspace configs and request rebuilds
- [ ] Plan cloud scaling for horizontal growth of pocket orchestration
- [ ] Design and prototype Agent Teams integration with team lead, parallel developer agents, and integrator

---

### Talk Outline

1. **Introduction** — Doctor Strange framing; evolution from prompt to environment engineering
2. **Prompt Engineering Limitations** — approval fatigue, Git history risk
3. **Context Engineering** — tools like Codex CLI, Copilot; combines prompts + context + tools
4. **Environment Engineering** — isolated environments, observability, board retrieval
5. **Live Demo: Multi-Model Redesign** — Haiku vs Sonnet vs Opus; audience vote; Opus wins
6. **Design Exploration via Forking** — tabs / accordions / side nav variants run in parallel
7. **Agent Teams Vision** — team lead, dev agents, integrator, human-in-the-loop
8. **Cloud Scaling** — horizontal growth beyond single machine
9. **Conclusion** — source code and slides available at summit
