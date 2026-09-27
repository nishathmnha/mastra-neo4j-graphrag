import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest";

export async function POST(
  request: Request
) {

  try {

    const body = await request.json();

    const {
      name = "document.txt",
      text,
    } = body;

    if (!text) {

      return NextResponse.json(
        {
          error: "text is required",
        },
        {
          status: 400,
        }
      );

    }

    const result =
      await ingestDocument(name, text);

    return NextResponse.json(result);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error: "Ingestion failed",
      },
      {
        status: 500,
      }
    );

  }
}