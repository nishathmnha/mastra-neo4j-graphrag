import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export async function createEmbedding(
  text: string
): Promise<number[]> {

  const result = await embed({
    model: openai.embedding(
      "text-embedding-3-small"
    ),
    value: text,
  });

  return result.embedding;
}