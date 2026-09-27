import { chunkText } from "./chunk";
import { createEmbeddings } from "./embedding";
import { extractGraph } from "./graph-extractor";
import { ensureNeo4jSchema } from "./neo4j";

import {
    saveDocument,
    saveChunkGraph,
} from "./graph-store";

const ingestionConcurrency = 4;

async function processConcurrently<T>(
    items: T[],
    worker: (item: T, index: number) => Promise<void>,
) {
    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            await worker(items[index], index);
        }
    }

    const workerCount = Math.min(ingestionConcurrency, items.length);
    await Promise.all(
        Array.from({ length: workerCount }, () => runWorker()),
    );
}

export async function ingestDocument(
    name: string,
    text: string
) {

    await ensureNeo4jSchema();

    const documentId = crypto.randomUUID();

    await saveDocument(
        documentId,
        name
    );

    const chunks = chunkText(text);
    const embeddings = await createEmbeddings(
        chunks.map((chunk) => chunk.text),
    );

    await processConcurrently(chunks, async (chunk, index) => {
        console.log(
            `Processing chunk ${chunk.id}`
        );

        const graph = await extractGraph(chunk.text);

        await saveChunkGraph(
            documentId,
            chunk.id,
            chunk.text,
            embeddings[index],
            graph,
        );
    });

    return {
        documentId,
        chunks: chunks.length,
    };
}
