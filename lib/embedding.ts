import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

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

export async function createEmbeddings(
    texts: string[],
): Promise<number[][]> {
    const result = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: texts,
        maxParallelCalls: 4,
    });

    return result.embeddings;
}
