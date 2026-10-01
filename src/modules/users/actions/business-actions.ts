"use server";

import { AppError } from "@/lib/errors/app-error";
import { getBusinessDocumentsForCurrentUser, getBusinessDocumentViewUrl, type BusinessDocument } from "../services/business-documents-service";
import { getCurrentBusinessProfile, type BusinessProfile } from "../services/business-profile-service";

/**
 * Server Actions for the Business profile and "My Documents" screens.
 *
 * Every action resolves the business identity from the authenticated session
 * (auth user → persisted business profile → NUI). There is deliberately no
 * parameter that lets a client choose an NUI or a user id: cross-business
 * access is impossible through these contracts.
 */

/** Frontend-facing shape for the My Business screen. */
export interface MyBusinessResult {
  profile: BusinessProfile;
  business: {
    nui: string;
    businessName: string;
    businessType: string;
    registrationDate: string;
    businessActivity: string;
    address: string;
    municipality: string;
    status: string;
    owner: string;
  };
  documents: BusinessDocument[];
}

/** Profile + registry documents for the signed-in business account. */
export async function getMyBusinessAction(): Promise<MyBusinessResult> {
  const { profile, business, documents } = await getBusinessDocumentsForCurrentUser();
  return { profile, business, documents };
}

/** Profile only (no registry call) for screens that need the trusted identity. */
export async function getCurrentBusinessProfileAction(): Promise<BusinessProfile> {
  return getCurrentBusinessProfile();
}

/**
 * Secure view reference for one of the business's own documents. Ownership is
 * verified server-side before any URL/reference is produced; another
 * business's document id resolves to NOT_FOUND.
 */
export async function getBusinessDocumentViewUrlAction(documentId: string): Promise<string> {
  if (typeof documentId !== "string" || documentId.trim().length === 0) {
    throw new AppError("VALIDATION", "A document id is required.");
  }
  return getBusinessDocumentViewUrl(documentId);
}
