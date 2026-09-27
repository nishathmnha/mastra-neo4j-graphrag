import neo4j from "neo4j-driver";

export const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(
        process.env.NEO4J_USERNAME!,
        process.env.NEO4J_PASSWORD!
    )
);

export function getSession() {
    return driver.session({
        database: process.env.NEO4J_DATABASE || "neo4j",
    });
}

const vectorIndexName = "chunk_embeddings";

export async function ensureNeo4jSchema() {
    const session = getSession();

    try {
        await session.run(`
            CREATE VECTOR INDEX ${vectorIndexName} IF NOT EXISTS
            FOR (chunk:Chunk) ON (chunk.embedding)
            OPTIONS {
                indexConfig: {
                    \`vector.dimensions\`: 1536,
                    \`vector.similarity_function\`: 'cosine'
                }
            }
        `);

        for (let attempt = 0; attempt < 20; attempt += 1) {
            const result = await session.run(
                `
                SHOW VECTOR INDEXES
                YIELD name, state, failureMessage
                WHERE name = $name
                RETURN state, failureMessage
                `,
                { name: vectorIndexName }
            );

            const record = result.records[0];
            const state = record?.get("state") as string | undefined;
            const failureMessage = record?.get("failureMessage") as string | undefined;

            if (state === "ONLINE") return;
            if (state === "FAILED") {
                throw new Error(`Neo4j vector index failed: ${failureMessage || "unknown error"}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 250));
        }

        throw new Error(`Neo4j vector index '${vectorIndexName}' is not online yet`);
    } finally {
        await session.close();
    }
}

export async function verifyNeo4jConnection() {
    await driver.verifyConnectivity();
}
