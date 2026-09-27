import { driver } from "./neo4j";
import { ExtractedGraph } from "./graph-extractor";

export async function saveDocument(
  id: string,
  name: string
) {

  const session = driver.session();

  try {

    await session.run(
      `
      MERGE (d:Document {id: $id})
      SET d.name = $name
      `,
      { id, name }
    );

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

  const session = driver.session();

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

  const session = driver.session();

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

  const session = driver.session();

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