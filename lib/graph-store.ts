import { getSession } from "./neo4j";
import { ExtractedGraph } from "./graph-extractor";

export async function saveChunkGraph(
  documentId: string,
  chunkId: string,
  text: string,
  embedding: number[],
  graph: ExtractedGraph,
) {
  const session = getSession();

  try {
    await session.executeWrite(async (transaction) => {
      await transaction.run(
        `
        MATCH (d:Document {id: $documentId})
        MERGE (c:Chunk {id: $chunkId})
        SET c.text = $text, c.embedding = $embedding
        MERGE (d)-[:HAS_CHUNK]->(c)
        `,
        { documentId, chunkId, text, embedding },
      );

      for (const entity of graph.entities) {
        await transaction.run(
          `
          MATCH (c:Chunk {id: $chunkId})
          MERGE (e:Entity {name: $name})
          SET e.type = $type
          MERGE (c)-[:MENTIONS]->(e)
          `,
          { chunkId, name: entity.name, type: entity.type },
        );
      }

      for (const relationship of graph.relationships) {
        await transaction.run(
          `
          MERGE (source:Entity {name: $source})
          MERGE (target:Entity {name: $target})
          MERGE (source)-[r:RELATED_TO]->(target)
          SET r.type = $type
          `,
          {
            source: relationship.source,
            target: relationship.target,
            type: relationship.type,
          },
        );
      }
    });
  } finally {
    await session.close();
  }
}

export async function saveDocument(
  id: string,
  name: string
) {

  const session = getSession();

  try {

    await session.executeWrite(async (transaction) => {
      await transaction.run(
        `
        MATCH (d:Document {name: $name})
        OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
        WITH collect(DISTINCT d) AS documents, collect(DISTINCT c) AS chunks
        UNWIND documents + chunks AS node
        DETACH DELETE node
        `,
        { name },
      );

      await transaction.run(
        `
        CREATE (d:Document {
          id: $id,
          name: $name,
          createdAt: datetime()
        })
        `,
        { id, name },
      );
    });

  } finally {
    await session.close();
  }
}


export async function saveChunk(
  documentId: string,
  chunkId: string,
  text: string,
  embedding: number[]
) {

  const session = getSession();

  try {

    await session.run(
      `
      MATCH (d:Document {id: $documentId})

      MERGE (c:Chunk {id: $chunkId})

      SET
        c.text = $text,
        c.embedding = $embedding

      MERGE (d)-[:HAS_CHUNK]->(c)
      `,
      {
        documentId,
        chunkId,
        text,
        embedding,
      }
    );

  } finally {
    await session.close();
  }
}

export async function saveEntities(
  chunkId: string,
  graph: ExtractedGraph
) {

  const session = getSession();

  try {

    for (const entity of graph.entities) {

      await session.run(
        `
        MATCH (c:Chunk {id: $chunkId})

        MERGE (e:Entity {name: $name})

        SET e.type = $type

        MERGE (c)-[:MENTIONS]->(e)
        `,
        {
          chunkId,
          name: entity.name,
          type: entity.type,
        }
      );

    }

  } finally {
    await session.close();
  }
}

export async function saveRelationships(
  graph: ExtractedGraph
) {

  const session = getSession();

  try {

    for (const relationship of graph.relationships) {

      await session.run(
        `
        MERGE (source:Entity {
          name: $source
        })

        MERGE (target:Entity {
          name: $target
        })

        MERGE (source)-[r:RELATED_TO]->(target)

        SET r.type = $type
        `,
        {
          source: relationship.source,
          target: relationship.target,
          type: relationship.type,
        }
      );

    }

  } finally {
    await session.close();
  }
}

export interface DocumentSummary {
  id: string;
  name: string;
  chunks: number;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const session = getSession();

  try {
    const result = await session.run(`
      MATCH (d:Document)
      OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
      RETURN
        d.id AS id,
        d.name AS name,
        d.createdAt AS createdAt,
        count(c) AS chunks
      ORDER BY createdAt DESC, name ASC
    `);

    return result.records.map((record) => {
      const chunkCount = record.get("chunks");
      return {
        id: record.get("id") as string,
        name: record.get("name") as string,
        chunks: typeof chunkCount?.toNumber === "function"
          ? chunkCount.toNumber()
          : Number(chunkCount),
      };
    });
  } finally {
    await session.close();
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const session = getSession();

  try {
    await session.executeWrite(async (transaction) => {
      await transaction.run(
        `
        MATCH (d:Document {id: $id})-[:HAS_CHUNK]->(c:Chunk)
        DETACH DELETE c
        `,
        { id },
      );

      await transaction.run(
        `
        MATCH (d:Document {id: $id})
        DETACH DELETE d
        `,
        { id },
      );

      await transaction.run(
        `
        MATCH (e:Entity)
        WHERE NOT (e)<-[:MENTIONS]-(:Chunk)
        DETACH DELETE e
        `,
      );
    });
  } finally {
    await session.close();
  }
}
