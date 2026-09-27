import { NextResponse } from "next/server";
import { deleteDocument } from "@/lib/graph-store";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "document id is required" }, { status: 400 });
    }

    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not delete document" },
      { status: 500 },
    );
  }
}
