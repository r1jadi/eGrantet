import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import { fetchArbkBusinessByNui, fetchArbkDocumentsByNui, type ArbkBusiness, type ArbkDocument } from "../arbk";
import { getCurrentBusinessProfile, type BusinessProfile } from "./business-profile-service";

/**
 * Business "My Documents" backend.
 *
 * Document/registry data is fetched by the business's trusted NUI (loaded
 * from the authenticated user's persisted business profile), never from a
 * client-supplied value. The registry lives behind the ARBK adapter, so a
 * live government integration can be plugged in later without changing this
 * contract or the frontend.
 */

/** Frontend-safe document contract for the My Documents screen. */
export interface BusinessDocument {
  id: string;
  name: string;
  type: string;
  description: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  source: "ARBK_REGISTRY";
  /** Whether a secure view can be generated for this document. */
  availableForViewing: boolean;
}

/** Frontend-safe business summary returned alongside documents. */
export type BusinessSummary = ArbkBusiness;

function toContract(document: ArbkDocument): BusinessDocument {
  return {
    id: document.id,
    name: document.name,
    type: document.type,
    description: null,
    issuedAt: document.issuedOn ?? null,
    expiresAt: null,
    status: "ACTIVE",
    source: "ARBK_REGISTRY",
    // Registry documents are official records; the adapter does not yet expose
    // retrievable files, so nothing is marked viewable until a real source
    // provides one (no fake view links).
    availableForViewing: false,
  };
}

/**
 * Loads the authenticated business's profile and retrieves its documents
 * through the registry adapter. Fails safely for Individuals and for registry
 * outages; document retrieval is audited at the access level (no contents).
 */
export async function getBusinessDocumentsForCurrentUser(): Promise<{ profile: BusinessProfile; business: BusinessSummary; documents: BusinessDocument[] }> {
  const profile = await getCurrentBusinessProfile();

  let business: BusinessSummary;
  try {
    business = await fetchArbkBusinessByNui(profile.businessNui);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      throw new AppError("NOT_FOUND", "No business record was found for this profile.");
    }
    throw new AppError("EXTERNAL_SERVICE", "The business registry is currently unavailable. Please try again later.", error);
  }

  let registryDocuments: ArbkDocument[];
  try {
    registryDocuments = await fetchArbkDocumentsByNui(profile.businessNui);
  } catch (error) {
    throw new AppError("EXTERNAL_SERVICE", "The business registry is currently unavailable. Please try again later.", error);
  }

  await recordAuditEvent({
    actorId: profile.userId,
    action: "business_documents_viewed",
    entityType: "business_profiles",
    entityId: profile.userId,
    metadata: { documentCount: registryDocuments.length },
  });

  return { profile, business, documents: registryDocuments.map(toContract) };
}

/**
 * Resolves a secure view reference for one business document. Registry
 * documents are official records without retrievable files in the current
 * integration; a NOT_FOUND keeps the contract honest until the live registry
 * feed provides file retrieval (the frontend renders a disabled action).
 */
export async function getBusinessDocumentViewUrl(documentId: string): Promise<string> {
  const profile = await getCurrentBusinessProfile();
  const documents = await getBusinessDocumentsForCurrentUser();
  const document = documents.documents.find((entry) => entry.id === documentId);
  if (!document) throw new AppError("NOT_FOUND", "Document not found.");

  // Ownership is implied by the trusted NUI (the registry was queried with
  // the profile's NUI, not a client value). Nothing to sign yet: the adapter
  // exposes no file retrieval, so a document cannot be viewed.
  void profile;
  throw new AppError("NOT_FOUND", "This document cannot be viewed online.");
}
