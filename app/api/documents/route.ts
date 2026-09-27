import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/graph-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load documents" },
      { status: 500 },
    );
  }
}
