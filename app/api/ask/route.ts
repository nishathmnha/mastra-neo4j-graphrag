import { NextResponse } from "next/server";
import { graphRag } from "@/lib/graphrag";

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

    const result =
      await graphRag(question);

    return NextResponse.json(result);

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