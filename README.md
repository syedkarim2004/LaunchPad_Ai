# LaunchPad AI

A business setup and compliance assistant for Indian MSMEs. The TypeScript backend builds a business profile, looks up applicable rules, and routes questions to specialist agents for documents, timelines and costs.

## Explore the implementation

- [Backend setup, dependencies and API](backend/README.md)
- [Master agent and its nine worker roles](backend/src/agents/masterAgent.ts)
- [Document classification and compliance lookup](backend/src/agents/documentAgent.ts)

The document handler uses uploaded file metadata. Field extraction accuracy and reductions in registration steps have not been established for this implementation.
