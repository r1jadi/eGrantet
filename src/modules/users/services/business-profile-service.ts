import "server-only";

import { requireAuth } from "@/lib/auth/server";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeBusinessNui } from "../nui";

/**
 * Trusted business-profile retrieval.
 *
 * The NUI always comes from the persisted business_profiles row keyed by the
 * authenticated user's id — never from client input. Cross-business access is
 * structurally impossible: there is no code path that accepts an NUI and
 * returns a profile.
 */

export interface BusinessProfile {
  userId: string;
  accountType: "BUSINESS";
  businessNui: string;
  displayName: string | null;
}

interface BusinessProfileRow {
  user_id: string;
  business_nui: string;
  display_name: string | null;
}

/**
 * Loads the authenticated user's business profile.
 * Throws AUTHENTICATION when signed out and AUTHORIZATION when the account
 * is not a business account (Individuals cannot reach business data).
 */
export async function getCurrentBusinessProfile(): Promise<BusinessProfile> {
  const user = await requireAuth();
  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("business_profiles")
    .select("user_id, business_nui, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) throw new AppError("DATABASE", "Unable to load the business profile.", profileError);
  if (!profile) throw new AppError("AUTHORIZATION", "This area is only available for business accounts.");

  const row = profile as BusinessProfileRow;
  const nui = normalizeBusinessNui(row.business_nui);
  if (!nui) throw new AppError("DATABASE", "The business profile is not configured correctly.");

  return {
    userId: row.user_id,
    accountType: "BUSINESS",
    businessNui: nui,
    displayName: row.display_name,
  };
}

/** Guard for business-only operations: returns the trusted profile or throws. */
export async function requireBusinessProfile(): Promise<BusinessProfile> {
  return getCurrentBusinessProfile();
}
