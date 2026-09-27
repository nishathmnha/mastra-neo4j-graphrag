import { Agent } from "@mastra/core/agent";

export const extractorAgent = new Agent({
    id: "graph-extractor",
    name: "Graph Extractor",

    model: "openai/gpt-5.6-luna",

    instructions: `
You extract knowledge graphs from text.

Identify important entities and relationships.

Entity examples:
- Service
- Application
- Database
- Company
- Person
- Product
- Technology
- API

Relationships should describe how two entities are connected.

Examples:

Payment Service USES Fraud Service

Fraud Service READS_FROM Risk Database

ABC Pay OPERATES Payment Service

Do not invent information that is not present in the text.
`,
});