import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { getApplicationDocumentDownloadUrl } from "@/modules/documents/services/document-download-service";

export const dynamic = "force-dynamic";

/** GET /api/documents/{id} → 307 redirect to a short-lived signed storage URL. */
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  try {
    const url = await getApplicationDocumentDownloadUrl(documentId);
    return NextResponse.redirect(url, 307);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION" || error.code === "VALIDATION")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to open the document." }, { status: 502 });
  }
}
