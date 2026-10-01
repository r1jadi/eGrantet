"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, toSafeErrorMessage } from "@/lib/errors/app-error";
import { updateMunicipalApplicationStatus } from "../services/application-service";
import { APPLICATION_STATUSES } from "../types";

const changeStatusInputSchema = z.object({
  applicationId: z.uuid(),
  nextStatus: z.enum(APPLICATION_STATUSES),
  message: z.string().trim().max(1_000).optional(),
});

export interface MunicipalActionState {
  status: "idle" | "success" | "error";
  message?: string;
  nextStatus?: string;
}

/**
 * Wraps the existing municipal status service (lifecycle guards, audit, and
 * notifications all live there). Zod failures are surfaced as safe validation
 * messages; everything else is masked by toSafeErrorMessage.
 */
export async function changeMunicipalApplicationStatusAction(_previous: MunicipalActionState, formData: FormData): Promise<MunicipalActionState> {
  const parsed = changeStatusInputSchema.safeParse({
    applicationId: formData.get("applicationId"),
    nextStatus: formData.get("nextStatus"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "The review action could not be processed." };
  }
  try {
    // Authorization lives in the service (requireMunicipalityAccess):
    // MUNICIPAL_EMPLOYEE members of the grant's municipality are authorized;
    // admins pass through the allowlist-gated membership check. The action
    // must not demand platform-admin privileges for staff review work.
    const application = await updateMunicipalApplicationStatus(parsed.data.applicationId, parsed.data.nextStatus, parsed.data.message);
    revalidatePath("/municipality/applications");
    revalidatePath("/municipality");
    revalidatePath(`/municipality/applications/${parsed.data.applicationId}`);
    return { status: "success", message: `Application status updated to ${application.status}.`, nextStatus: application.status };
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION") {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: toSafeErrorMessage(error) };
  }
}
