import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

interface IntegrationConfig {
  url: string;
  anonKey: string;
  email: string;
  password: string;
  municipalityId?: string;
  otherMunicipalityId?: string;
  otherApplicantApplicationId?: string;
}

function integrationConfig(): IntegrationConfig | null {
  if (process.env.RUN_SUPABASE_INTEGRATION_TESTS !== "true") return null;
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_TEST_EMAIL: email, SUPABASE_TEST_PASSWORD: password } = process.env;
  if (!url || !anonKey || !email || !password) return null;
  return { url, anonKey, email, password, municipalityId: process.env.SUPABASE_TEST_MUNICIPALITY_ID, otherMunicipalityId: process.env.SUPABASE_TEST_OTHER_MUNICIPALITY_ID, otherApplicantApplicationId: process.env.SUPABASE_TEST_OTHER_APPLICANT_APPLICATION_ID };
}

async function authenticatedClient(config: IntegrationConfig) {
  const client = createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email: config.email, password: config.password });
  assert.equal(error, null, error?.message ?? "Authentication failed.");
  return client;
}

const config = integrationConfig();
const skip = config ? false : "Set RUN_SUPABASE_INTEGRATION_TESTS=true with dedicated SUPABASE_TEST_* credentials to run against Supabase.";

test("authenticated Supabase user and profile are resolved through RLS", { skip }, async () => {
  const client = await authenticatedClient(config!);
  const { data: userData, error: userError } = await client.auth.getUser();
  assert.equal(userError, null, userError?.message ?? "User lookup failed.");
  assert.ok(userData.user);
  const { data: profile, error: profileError } = await client.from("users").select("id, role, full_name").eq("id", userData.user.id).single();
  assert.equal(profileError, null, profileError?.message ?? "Profile lookup failed.");
  assert.equal(profile.id, userData.user.id);
  assert.ok(["APPLICANT", "MUNICIPAL_EMPLOYEE", "EVALUATOR", "ADMIN"].includes(profile.role));
});

test("RLS hides municipality memberships outside the authenticated user's scope", { skip: skip || !config?.municipalityId || !config.otherMunicipalityId }, async () => {
  const client = await authenticatedClient(config!);
  const { data: ownMembership, error: ownError } = await client.from("municipality_members").select("municipality_id").eq("municipality_id", config!.municipalityId!).maybeSingle();
  assert.equal(ownError, null, ownError?.message ?? "Membership lookup failed.");
  assert.ok(ownMembership);
  const { data: otherMembership, error: otherError } = await client.from("municipality_members").select("municipality_id").eq("municipality_id", config!.otherMunicipalityId!).maybeSingle();
  assert.equal(otherError, null, otherError?.message ?? "Cross-municipality lookup failed.");
  assert.equal(otherMembership, null);
});

test("RLS hides another applicant's application from a dedicated applicant test user", { skip: skip || !config?.otherApplicantApplicationId }, async () => {
  const client = await authenticatedClient(config!);
  const { data, error } = await client.from("applications").select("id").eq("id", config!.otherApplicantApplicationId!).maybeSingle();
  assert.equal(error, null, error?.message ?? "Cross-applicant lookup failed.");
  assert.equal(data, null);
});
