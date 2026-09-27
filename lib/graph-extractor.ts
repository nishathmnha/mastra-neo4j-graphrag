import { z } from "zod";
import { extractorAgent } from "@/mastra/agents/extractor-agent";

const graphSchema = z.object({

  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
    })
  ),

  relationships: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.string(),
    })
  ),

});

export type ExtractedGraph =
  z.infer<typeof graphSchema>;

export async function extractGraph(
  text: string
): Promise<ExtractedGraph> {

  const response = await extractorAgent.generate(
    `
Extract entities and relationships from this text:

${text}
`,
    {
      structuredOutput: {
        schema: graphSchema,
      },
    }
  );

  if (!response.object) {
    throw new Error(
      "Graph extraction returned no structured output"
    );
  }

  return response.object;
}