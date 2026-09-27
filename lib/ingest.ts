import { chunkText } from "./chunk";
import { createEmbedding } from "./embedding";
import { extractGraph } from "./graph-extractor";

import {
    saveDocument,
    saveChunk,
    saveEntities,
    saveRelationships,
} from "./graph-store";

export async function ingestDocument(
    name: string,
    text: string
) {

    const documentId = crypto.randomUUID();

    await saveDocument(
        documentId,
        name
    );

    const chunks = chunkText(text);

    for (const chunk of chunks) {

        console.log(
            `Processing chunk ${chunk.id}`
        );

        const [embedding, graph] =
            await Promise.all([
                createEmbedding(chunk.text),
                extractGraph(chunk.text),
            ]);

        await saveChunk(
            documentId,
            chunk.id,
            chunk.text,
            embedding
        );

        await saveEntities(
            chunk.id,
            graph
        );

        await saveRelationships(graph);
    }

    return {
        documentId,
        chunks: chunks.length,
    };
}