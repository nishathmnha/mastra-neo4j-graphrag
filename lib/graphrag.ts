import { ensureNeo4jSchema, getSession } from "./neo4j";
import { createEmbedding } from "./embedding";
import { answerAgent } from "@/mastra/agents/answer-agent";

export interface RetrievedChunk {
    id: string;
    text: string;
    score: number;
}

export interface GraphRelationship {
    source: string;
    type: string;
    target: string;
}

async function vectorSearch(
    embedding: number[],
    limit = 3
): Promise<RetrievedChunk[]> {

    const session = getSession();

    try {

        const result = await session.run(
            `
      MATCH (chunk:Chunk)

      SEARCH chunk IN (
        VECTOR INDEX chunk_embeddings
        FOR $embedding
        LIMIT $limit
      ) SCORE AS score

      RETURN
        chunk.id AS id,
        chunk.text AS text,
        score
      ORDER BY score DESC
      `,
            {
                embedding,
                limit,
            }
        );

        return result.records.map(record => ({
            id: record.get("id"),
            text: record.get("text"),
            score: record.get("score"),
        }));

    } finally {
        await session.close();
    }
}


async function getSeedEntities(
    chunkIds: string[]
): Promise<string[]> {

    if (chunkIds.length === 0) {
        return [];
    }

    const session = getSession();

    try {

        const result = await session.run(
            `
      MATCH (c:Chunk)-[:MENTIONS]->(e:Entity)

      WHERE c.id IN $chunkIds

      RETURN DISTINCT e.name AS name
      `,
            {
                chunkIds,
            }
        );

        return result.records.map(
            record => record.get("name")
        );

    } finally {
        await session.close();
    }
}

async function expandGraph(
    entityNames: string[]
): Promise<GraphRelationship[]> {

    if (entityNames.length === 0) {
        return [];
    }

    const session = getSession();

    try {

        const result = await session.run(
            `
      MATCH path =
        (seed:Entity)-[:RELATED_TO*1..2]-(related:Entity)

      WHERE seed.name IN $entityNames

      UNWIND relationships(path) AS rel

      WITH DISTINCT
        startNode(rel) AS source,
        rel,
        endNode(rel) AS target

      RETURN
        source.name AS source,
        rel.type AS type,
        target.name AS target

      LIMIT 30
      `,
            {
                entityNames,
            }
        );

        return result.records.map(record => ({
            source: record.get("source"),
            type: record.get("type"),
            target: record.get("target"),
        }));

    } finally {
        await session.close();
    }
}

function buildContext(
    chunks: RetrievedChunk[],
    relationships: GraphRelationship[]
) {

    const chunkContext = chunks
        .map(
            (chunk, index) =>
                `[Chunk ${index + 1}]\n${chunk.text}`
        )
        .join("\n\n");

    const graphContext = relationships
        .map(
            relationship =>
                `${relationship.source} -> ${relationship.type} -> ${relationship.target}`
        )
        .join("\n");

    return `
DOCUMENT CONTEXT

${chunkContext}


GRAPH CONTEXT

${graphContext}
`;
}


async function generateAnswer(
    question: string,
    context: string
) {

    const response =
        await answerAgent.generate(buildAnswerPrompt(question, context));

    return response.text;
}

function buildAnswerPrompt(
    question: string,
    context: string,
) {
    return `
Question:

${question}


Context:

${context}
`;
}

export async function graphRag(
    question: string
) {

    await ensureNeo4jSchema();

    // 1. Embed question

    const embedding =
        await createEmbedding(question);


    // 2. Vector retrieval

    const chunks =
        await vectorSearch(
            embedding,
            3
        );


    // 3. Find graph entry points

    const entities =
        await getSeedEntities(
            chunks.map(chunk => chunk.id)
        );


    // 4. Expand graph

    const relationships =
        await expandGraph(entities);


    // 5. Build context

    const context =
        buildContext(
            chunks,
            relationships
        );


    // 6. LLM generation

    const answer =
        await generateAnswer(
            question,
            context
        );


    return {
        answer,
        chunks,
        entities,
        relationships,
    };
}

export async function streamGraphRag(question: string) {
    await ensureNeo4jSchema();

    const embedding = await createEmbedding(question);
    const chunks = await vectorSearch(embedding, 3);
    const entities = await getSeedEntities(chunks.map((chunk) => chunk.id));
    const relationships = await expandGraph(entities);
    const context = buildContext(chunks, relationships);

    const response = await answerAgent.stream(
        buildAnswerPrompt(question, context),
    );

    return response.textStream;
}
