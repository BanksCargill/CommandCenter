import { db } from './lib/db';
import { docs } from './db/schema';
import { eq } from 'drizzle-orm';

const doc10 = `# The Doctor Strange Approach to Parallel Agent Orchestration

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
forked \`tsk\`
then uses docker to kick off the appropriate model
then pull the changed back via \`tsk\`

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
- **Tsk is the underlying orchestration primitive** — Pocket Manager is a fork of \`tsk\`, using Docker to spin up isolated model environments and retrieve changes. This is the actual mechanism behind the demo.
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
9. **Conclusion** — source code and slides available at summit`;

const doc13 = `# The Practical Path to Custom LLMs

**Event:** RVATech Data Summit 2026
Andrew Novokhatny

---

## Notes
- 10bn parameter llm on mac mini (m4)
- llama-3 open source via facebook (405 bn paramters)
- Training a model: fine tuning vs rag (what is rag?)
- fine tuning - good for high accuracy when the data does not change quickly
- RAG: requires real time updates to the underlying data



## Key Takeaways

## Questions / Follow-ups

---

## AI Takeaways

- **LoRA is the key technique to understand** — Low-Rank Adaptation freezes the base model weights and bolts on small adapter layers. This is how you fine-tune a 10B parameter model on consumer hardware without touching the original weights or needing massive GPU resources.
- **He fine-tuned a model of himself** — the training data was 3,000+ personal journal entries. The goal was mimicking his own writing style, not domain knowledge. An accessible, concrete use case for fine-tuning that isn't enterprise-scale.
- **ROUGE-L + semantic similarity as eval metrics** — not just vibes. Llama performed well; Gemma showed voice/grammar inconsistencies. Having objective metrics is what made model comparison meaningful.
- **Training took 6 hours with no parallelization** — unified memory limits on the Mac caused crashes when parallelized. A real hardware constraint to plan around before building a local fine-tuning pipeline.
- **Key recommendation: local fine-tuned models often beat frontier models for narrow tasks** — if your use case is static and well-scoped, a small local model is faster, cheaper, and more controllable.
- **Fine-tuning vs RAG decision rule (expanded):** fine-tune when data is stable and you need style/behavior changes; use RAG when data changes frequently or you need factual grounding. They are complementary, not mutually exclusive.
- **Part 2 showed a live summarization app** — converted long journal excerpts into bullet points; the smaller model outperformed Gemma on speed despite having fewer parameters.

---

## AI Summary

### Overview

The talk walked through fine-tuning a large language model on personal data — specifically, 3,000+ journal entries — to mimic the speaker's own writing style. The goal was to make fine-tuning on consumer hardware concrete and accessible, not just theoretical.

---

### Key Concepts

**Fine-Tuning vs RAG**

| Approach | Best for |
|----------|----------|
| Fine-tuning | Static data; style/behavior changes; high-accuracy narrow tasks |
| RAG | Frequently changing data; factual grounding; dynamic retrieval |

Both can be combined — e.g., in retail e-commerce where product data changes but tone should stay consistent.

**LoRA (Low-Rank Adaptation)**
- Freezes base model weights entirely
- Bolts on small adapter layers that capture the target writing style
- Dramatically reduces compute and memory requirements
- Enables fine-tuning on consumer hardware (32GB Mac mini M4)

---

### Process Summary

1. Transcribed 3,000+ journal entries into a structured dataset
2. Downloaded base models from Hugging Face (llama-3, Gemma, others)
3. Preprocessed data — scrubbed PII, NLP cleanup, instruction synthesis
4. Generated synthetic training prompts using a local LLM
5. Applied LoRA fine-tuning — 6-hour run, single-threaded due to memory limits
6. Evaluated with ROUGE-L and semantic similarity scores

**Results:** Llama performed well and maintained voice consistency. Gemma showed grammar inconsistencies and voice drift.

---

### Hardware Constraints

- 32GB unified memory Mac mini M4
- No parallelization — unified memory overshot available resources when parallelized
- Inference for the summarization app still outpaced Gemma on speed

---

### Use Cases Discussed

- **Clinical medicine** — static domain; fine-tuning well-suited
- **Finance** — fast-moving; RAG preferred
- **Legal** — stable rules; fine-tuning viable
- **Retail e-commerce** — hybrid: RAG for product data + fine-tuned tone

---

### Practical Takeaway

For many common use cases, a small locally fine-tuned model is faster, cheaper, and more controllable than a frontier model. The speaker demonstrated this with a working summarization app built on a fine-tuned 10B parameter model running locally.

---

### Transcripts & Resources

**Part 1:** https://otter.ai/u/4AHTFx0pt2l8NkGM2p40mc2wgWo
**Part 2:** https://otter.ai/u/E1aNw5HKMmz6eRR1iIuSNJYyh8U

---

### Action Items

- [ ] Share fine-tuning code and setup artifacts (Python stack, synthetic prompt generation) with interested attendees`;

const doc15 = `## Building Critical Thinkers in the Age of AI-Assisted Coding

**Event:** RVATech Data Summit 2026

---

## Notes
Market is not shrinking but splitting:
-Ai Engineers and Software development

## Key Takeaways
- Amplifies the user's fundamentals/skills
- Contradicting signals: we don't trust the code generated by AI yet we are utilizing it to write code across different applications and saying "use it!"

### Progressive AI Autonomy (levels to prove competence)
1. AI as a tutor, write their own code, debug and fix bugs
2. Spec first & test first, AI as typics, own code and review
3. Integrate AI, Refactore, quality gate, employee as the commander
4. Orchestrator, design workflows, guardrails


## Questions / Follow-ups
- I'm not sure I agree with the degradation of ai as it trains on AI written code
    - In theory, if we are responsibly developing with AI, the code generated by AI should be similar in creativity and application as the human written code it was originally generated with

---

## AI Takeaways

- **The hackathon is the empirical proof of the thesis** — a real mentoring session where students built an elder-care app. Teams with strong fundamentals used AI effectively; one team fully dependent on AI saw the app crash when AI lost context and had to revert to manual code. The speaker wasn't theorizing — this happened.
- **"Model collapse" is the concern behind your question** — the speaker specifically introduced this framing: as AI-generated code dominates training data, models lose originality and drift from human-quality baselines. Your counterpoint (responsible use produces quality code) is valid but depends on responsible use holding at scale across the industry, which is far from guaranteed.
- **Test-first before prompting AI is the key Level 2 workflow shift** — write specs and test cases before you touch the AI prompt. This inverts the typical "generate then validate" pattern and is what separates casual AI use from disciplined AI use.
- **Reward quality over velocity is the hardest org change** — the talk explicitly calls out that current team metrics (throughput, velocity) actively incentivize AI overuse. Without changing what gets rewarded, the autonomy model can't work in practice.
- **3 peer reviews required for AI-generated components** — a specific, concrete policy recommendation worth noting if evaluating or building an AI governance framework.
- **Human-in-the-loop for customer-facing AI output** — framed as a safety/compliance requirement, not just a quality gate. Relevant if your org is deploying AI-assisted features to users.

---

## AI Summary

### Overview

The talk used a hackathon case study to argue that AI tools **amplify existing skills** — strong developers become more effective, weak developers become more chaotic. The speaker proposed a **Progressive AI Autonomy** model to structure how organizations should roll out AI coding tools across developer levels.

---

### The Hackathon Case Study

Students built an elder-care app with notifications and emergency contacts. Results split clearly:

- **Teams with strong fundamentals** — used AI for explanations and examples; maintained control when issues arose
- **One team without fundamentals** — AI-dependent; when AI lost context, the app crashed; had to revert to manual coding

The conclusion: AI is a force multiplier, not a foundation.

---

### Core Arguments

- AI generates code via next-token prediction — it doesn't test or verify correctness
- The contradiction: organizations distrust AI-generated code yet tell developers to use it
- Risk of **model collapse**: AI training on AI-generated code loses originality and drifts from human-quality baselines over time
- The market is splitting — AI Engineers vs. traditional Software Developers — the floor is rising, but the ceiling is rising faster for developers who invest in fundamentals

---

### Progressive AI Autonomy Model

| Level | Role | Access & Expectations |
|-------|------|-----------------------|
| 1 | Tutor | AI explains and suggests; developer writes, debugs, and fixes all code manually |
| 2 | Typist | Spec-first and test-first; AI generates; developer owns, reviews, and validates |
| 3 | Commander | Full AI integration; refactoring; quality gates; developer directs and is accountable |
| 4 | Orchestrator | Designs workflows and guardrails; architects org-level AI usage policy |

Progression is **gated by demonstrated competence**, not seniority or tenure.

---

### Recommended Industry Actions

- Define engineering standards specifying when AI-generated code may be used and what validations are required
- Require **at least 3 peer reviews** for AI-produced components
- Adopt **test-driven workflows** — write specs and test cases before prompting AI to generate implementations
- Shift performance metrics to reward **quality** (bugs caught, incidents prevented, security issues identified) over raw velocity
- Give junior engineers a safe practice space — assign debugging and bug-fix tasks before granting AI production access
- Partner with universities to integrate fundamentals training and AI skill mastery into curricula
- Implement **human-in-the-loop controls** for AI-generated outputs involving sensitive customer data

---

### Transcript & Resources

- Transcript: https://otter.ai/u/q51fEEFgYp-SCo8XvgG3Wpc5QAc`;

async function main() {
  await db.update(docs).set({ content: doc10, updatedAt: new Date() }).where(eq(docs.id, 10));
  console.log('Patched doc 10: Doctor Strange');
  await db.update(docs).set({ content: doc13, updatedAt: new Date() }).where(eq(docs.id, 13));
  console.log('Patched doc 13: Custom LLMs');
  await db.update(docs).set({ content: doc15, updatedAt: new Date() }).where(eq(docs.id, 15));
  console.log('Patched doc 15: Raising the Floor');
}

main();
