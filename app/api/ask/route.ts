import { NextResponse } from "next/server";
import { streamGraphRag } from "@/lib/graphrag";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {

  try {

    const body = await request.json();

    const { question } = body;

    if (!question) {

      return NextResponse.json(
        {
          error: "question is required",
        },
        {
          status: 400,
        }
      );

    }

    const textStream = await streamGraphRag(question);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error: "GraphRAG query failed",
      },
      {
        status: 500,
      }
    );

  }
}
