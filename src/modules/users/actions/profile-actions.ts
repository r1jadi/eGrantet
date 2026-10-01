"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fullNameSchema } from "../schemas";

/**
 * Own-profile management. The profile row is loaded through the signed-in
 * user's identity; a client can only ever change their own display name.
 */
export interface ProfileActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

const updateProfileSchema = z.object({
  fullName: fullNameSchema,
});

export async function updateProfileAction(_previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = updateProfileSchema.safeParse({ fullName: formData.get("fullName") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid profile." };
  try {
    const user = await requireAuth();
    const { error } = await createSupabaseAdminClient().from("users").update({ full_name: parsed.data.fullName }).eq("id", user.id);
    if (error) throw new AppError("DATABASE", "Unable to save your profile.", error);
    revalidatePath("/settings/profile");
    revalidatePath("/settings/notifications");
    return { status: "success", message: "Profile saved." };
  } catch (error) {
    return { status: "error", message: error instanceof AppError ? error.message : "Unable to save your profile. Please try again." };
  }
}
