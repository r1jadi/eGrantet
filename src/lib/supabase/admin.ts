import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "./env";

/** Use only in server-side administrative workflows; never import from UI code. */
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicEnv();
  return createClient(url, getSupabaseServiceRoleKey(), { auth: { autoRefreshToken: false, persistSession: false } });
}
