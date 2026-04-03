## Code review bot:
- We already use docker - MCP allows us to link in. Do we need Strands?
- Agents that have context within their domain could resolve this in some way:
- Review orchestrator can kick off agents with specific information to review against
- How do we keep their context menu's small so token generation is minimized?

### Internal AI Deployment Strategy
- docker images for the api/context manager + RAG/MCP coordinator

### Using AI when it's overkill
- Common theme
- Don't feed raw data. Extract via scripts and allow ai to analyze
- simultaneous access to a `local` model is expensive

### Costs
- Inevitable increase of large model usage
- Edgar: how do we hand the costs down to the users?
- Shravan: subscription for  AI usage

### Security, ownership and deploying to production
- Prototypes will need a formal review of AI generated code if we are going to ship them
- Great for quick assessment of requirements and to generate PRD (Product Requirements Document). Kicking off architecture and production code, should be a software engineer's role
- Code created is owned by the creator. Full responsibility on human creator