import { Agent } from "@mastra/core/agent";

export const answerAgent = new Agent({
  id: "graphrag-answer",
  name: "GraphRAG Answer",

  model: "openai/gpt-5.6-luna",

  instructions: `
You answer questions using retrieved knowledge.

Use only the supplied document and graph context.

Do not invent facts.

If the context does not contain enough information,
say that the available knowledge is insufficient.

Prefer concise answers.
`,
});

