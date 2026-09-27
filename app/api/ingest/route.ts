import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/extract";
import { ingestDocument } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {

  try {

    const contentType = request.headers.get("content-type") || "";
    let name = "document.txt";
    let text = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }

      name = file.name || name;
      const isPdf = file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
      text = isPdf
        ? await extractPdfText(new Uint8Array(await file.arrayBuffer()))
        : await file.text();
    } else {
      const body = await request.json();
      name = body.name || name;
      text = body.text || "";
    }

    if (!text) {

      return NextResponse.json(
        {
          error: "No readable text was found in the document",
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
