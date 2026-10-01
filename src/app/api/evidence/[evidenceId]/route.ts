import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { getEvidenceDownloadUrl } from "@/modules/grantee";

export const dynamic = "force-dynamic";

/** GET /api/evidence/{id} → 307 redirect to a short-lived signed storage URL. */
export async function GET(_request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await params;
  try {
    const url = await getEvidenceDownloadUrl(evidenceId);
    return NextResponse.redirect(url, 307);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "AUTHORIZATION" || error.code === "VALIDATION")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to open the evidence file." }, { status: 502 });
  }
}
