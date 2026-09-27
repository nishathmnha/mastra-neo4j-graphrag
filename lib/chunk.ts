export interface TextChunk {
  id: string;
  text: string;
}

export function chunkText(
  text: string,
  size = 2500
): TextChunk[] {

  const chunks: TextChunk[] = [];

  for (let i = 0; i < text.length; i += size) {

    const content = text.slice(i, i + size).trim();

    if (!content) {
      continue;
    }

    chunks.push({
      id: crypto.randomUUID(),
      text: content,
    });
  }

  return chunks;
}
