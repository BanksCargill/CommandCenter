# AI in Software Development: Lessons from RVATech 2026
**Audience:** Software Engineering Department  
**Focus:** Lessons Learned & Next Steps  

---

## Slide 1: Setting the Scene
- RVATech Data Summit 2026: what we went to learn
- Core question: where does AI actually fit in our engineering workflow?
- Spoiler: the industry is earlier than the hype suggests
- We have a head start: enterprise Claude licensing gives us a secure, capable foundation to build on

---

## Slide 2: Where the Industry Is Right Now
- Almost no one is using AI for production code yet
- Trust is low, earned slowly through observed mistakes and hallucinations
- The market is splitting: AI Engineers vs. traditional Software Developers
- Cost of running agents at scale is approaching a real feasibility ceiling

---

## Slide 3: Lesson 1 - AI Amplifies What You Already Have
- A hackathon case study: teams with strong fundamentals thrived; an AI-dependent team collapsed when the model lost context
- AI is a force multiplier, not a foundation
- The weaker your fundamentals, the more dangerous AI overuse becomes
- *Implication for us: investing in fundamentals is more important now, not less*

---

## Slide 4: Lesson 2 - Maturity Is a Spectrum
- Three stages observed across teams: Prompt Engineering, Context Engineering, Environment Engineering
- Most teams, including us, are still at stage 1 or 2
- Stage 3 (isolated environments, parallel agents, observability) is where the real productivity gains live
- *Implication for us: know where we are before deciding where to go*

---

## Slide 5: Lesson 3 - Use the Right Tool for the Job
- "Butter knife, not chainsaw": don't feed raw data to AI, extract and clean it first
- AI overkill is a real cost and quality problem
- The best use cases observed: UI prototyping, call center support augmentation, requirements drafting, code review assistance, not raw code generation at scale
- *Implication for us: define where AI earns its place in our workflow*

---

## Slide 6: Lesson 4 - Your Codebase Is a Double-Edged Asset
- AI trained on or indexed against your code learns your bad habits as well as your good ones
- Legacy code and anti-patterns will be perpetuated if you don't curate what the model sees
- A coding standards document is the authoritative source of truth, not the codebase itself
- *Implications for us:*
  - *We need to ensure our coding guidelines are part of the AI's context for review*
  - *RAG (Retrieval Augmented Generation) for review context*

---

## Slide 7: Risks to Keep in Mind
- **Model collapse** - AI training on AI-generated code degrades quality over time industry-wide
- **Over-reliance** - developers who skip fundamentals have no fallback when AI fails
- **Cost unpredictability** - agentic token usage can exceed feasibility faster than expected
- **Governance gap** - AI-generated code needs a defined review and ownership policy before it ships

---

## Slide 8: Best Practices Worth Adopting
- Write specs and tests *before* prompting AI to generate code
- Code is owned by the human responsible for it, not the AI that assisted. *Own* your code. Nothing changes here for us.
- AI does not change our quality bar, only how we get there
- Keep a human in the loop for any customer-facing AI output
- Define internal AI autonomy levels so expectations are consistent across the team

---

## Slide 9: Our Foundation - Enterprise Claude
- We have enterprise licensing, data protections are contractual, not just assumed
- This enables us to use Claude Code directly against our codebase with confidence
- Claude Code plus our coding standards doc equals a reviewable, context-aware AI assistant today
- This is our near-term competitive advantage, use it deliberately

---

## Slide 10: Building an AI-Ready Standards and Context Guide
- Our existing C++ style guide covers *how* to write code: naming, const usage, conventions
- AI also needs to understand *why* our system is designed the way it is: architecture, boundaries, domain context
- Together these form an **AI context guide**, the authoritative source of truth for any AI tool reviewing or generating code
- **Structured in plain markdown**, not tied to Claude specifically; any AI tool (Copilot, Cursor, Gemini, local models) can consume it
- Sections to include:
  - Coding style rules (existing style guide, reformatted)
  - System architecture overview and component boundaries
  - Explicit anti-patterns: legacy code we are phasing out, do not replicate
  - Known fragile areas requiring extra scrutiny
  - Ownership and escalation expectations
- *This is the prerequisite for almost everything else on this roadmap, start here*

---

## Slide 11: Next Steps - Short Term
- [ ] Adopt the "butter knife" principle as a team guideline for AI usage
- [ ] Define a lightweight internal AI autonomy model (even two levels is a start)
- [ ] Formalize a policy for AI-generated code review before anything ships to production
- [ ] Convert our style guide into a full AI context guide (CLAUDE.md / model-agnostic markdown)
- [ ] Identify 2-3 low-risk internal workflows to pilot Claude Code on immediately

---

## Slide 12: Next Steps - Medium Term

### CI/CD and MCP Integration
- Integrate MCP into our CI/CD pipeline as our first hands-on experience with the MCP pattern
- Initial use cases (read-only, low risk):
  - Auto-pull Jira ticket context when a PR is opened
  - Claude reviews the diff against our AI context guide and posts a structured comment
  - Failing CI tests trigger a diagnostic agent that summarizes the failure and checks recent commits
- This is a learning investment: understanding MCP failure modes, auth patterns, and agent behavior in a controlled internal environment directly informs how we would expose MCP to clients later
- *Human-in-the-loop controls and full observability are required from day one here*

### RAG and Observability
- [ ] Build a RAG prototype using a curated subset of the codebase for PR review context
- [ ] Establish token cost thresholds, define what "too expensive" looks like before we hit it
- [ ] Add observability to any AI tooling we ship internally

---

## Slide 13: Next Steps - Medium to Long Term

### User-Facing AI Chatbot
- Build a documentation chatbot trained against both our user-facing docs and internal documentation
- Users get instant, accurate answers without waiting for support, grounded only in our documentation, not general AI knowledge
- Internal teams benefit too: engineers, support staff, and new hires can query internal docs the same way
- Architecture: RAG over curated documentation, Claude (enterprise), response grounded in our content
- Key requirements:
  - Answers must cite source documentation, no hallucinated responses
  - Scope-limited: the bot only answers from our docs, not general knowledge
  - Human escalation path when confidence is low
  - Usage monitoring to identify documentation gaps

### Client-Facing MCP
- Once CI/CD MCP is stable and understood, evaluate exposing select read-only API endpoints as a client-facing MCP server
- Clients connect their AI tools directly to our platform, no custom integration required
- Start with read-only: query and analyze before agents can take actions
- *The internal CI/CD work is the prerequisite, learn the failure modes before exposing them to customers*

---

## Slide 14: Long Term Vision
- [ ] Revisit agent orchestration architecture as the team's maturity level grows
- [ ] Evaluate AI-assisted features natively within our product
- [ ] Develop a position on AI usage in the context of junior developer growth and mentorship

---

## Slide 15: Open Questions for the Team
- Where do we sit on the AI maturity curve today?
- How do we ensure we are developing our engineers to tackle tomorrow's problems?
- What does responsible AI use look like for junior engineers?
- Who owns the AI context guide, and when do we start it?