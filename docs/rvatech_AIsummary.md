# RVATech Data Summit 2026 — High-Level Summary

## Talk Summaries

### "The Doctor Strange Approach to Parallel Agent Orchestration"

This was probably the most technically dense talk. The speaker from Allianz Partners framed AI maturity as a three-stage evolution: prompt engineering → context engineering → environment engineering. The live demo was the centerpiece — three models (Haiku, Sonnet, Opus) competed on the same redesign prompt in parallel isolated "pockets," the audience voted, and Opus won. The winning environment was then forked into three design variants, which is the Doctor Strange / parallel timelines metaphor. The proposed agent team structure (team lead → parallel developer agents → integrator → human) maps closely to your own observation in the notes about value in hierarchical agent orchestration.

### "Raising the Floor Without Lowering the Ceiling" (Building Critical Thinkers)

This talk argued that AI amplifies existing skills rather than replacing them, backed by a real hackathon case study. Teams with strong fundamentals used AI effectively; a team that was fully AI-dependent crashed when the model lost context. The speaker proposed a Progressive AI Autonomy model with four levels — from AI-as-tutor all the way to AI-as-orchestrator — gated by demonstrated competence, not seniority.

### General Summit Conversations

The lunch discussion was arguably as valuable as the talks. Key signals: almost no one is using AI for production-level code yet; trust is low and earned slowly; the economy of agents is becoming a real constraint (token costs are approaching a feasibility ceiling); and the "use the butter knife, not the chainsaw" framing is a good gut-check heuristic for when AI is overkill.

---

## How This Compares to Shravan's Initial Presentation

There's strong thematic alignment, but the summit pushed further on a few fronts:

| Theme | Shravan's Presentation | Summit Talks |
|---|---|---|
| Agent architecture | Code review bot with orchestrator + domain agents | Full three-tier team lead → dev agents → integrator model with isolated environments |
| Cost / economy | Subscription model to hand costs to users | Broader alarm — token usage may already exceed feasibility at scale |
| AI in production | Formal review required before shipping AI code | Consistent: almost no one is doing it yet; trust must be earned |
| Developer role | Architects and engineers own AI output | Progressive autonomy model formalizes this with four competency levels |
| Context management | Keep context menus small to minimize tokens | Environment engineering (isolated pockets) is the more mature answer to this same problem |

Shravan's framing was practical and grounded in your existing stack (Docker, MCP). The summit talks, particularly the Doctor Strange one, showed what a more mature version of that same architecture looks like when taken further — which suggests your team is on the right track, just earlier in the maturity curve.

---

## Recommended Next Steps

### Short Term
- Adopt the "butter knife, not chainsaw" principle as an internal guideline — extract and clean data via scripts before feeding AI, rather than dumping raw data at it.
- Define a lightweight version of the Progressive AI Autonomy model internally. Even a two-level version (AI-as-assistant vs. AI-as-generator-with-review) would give the team a shared framework.
- Formalize a code review policy for AI-generated code before anything ships to production. The summit suggested at least 3 peer reviews; even starting with a mandatory single senior review is a step forward.

### Medium Term
- Revisit Shravan's code review bot architecture with the three-tier agent model in mind. The pattern (orchestrator → domain agents → consolidation) is the same; the question is whether isolated Docker environments per agent add enough value to pursue.
- Explore the observability angle. Real-time monitoring of what agents are doing was called out as a required pillar, not a nice-to-have, and it's absent from the current architecture discussion.
- Have a concrete conversation about cost thresholds — at what token volume does a use case become infeasible, and who owns that decision?

### Long Term
- The custom LLM thread from lunch (local model trained on your codebase, hooked into Claude Code/MCP) is worth a small prototype. The hardware bar is lower than expected (Apple M4, 32GB RAM), and the potential to have a model that codes in your team's style is meaningful.
- Begin thinking about how you'll handle the children/education concern you flagged — if your product touches end users or younger audiences, this is a values question worth getting ahead of.
