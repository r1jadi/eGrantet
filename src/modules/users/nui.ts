import { z } from "zod";

/**
 * Canonical Business NUI normalization and validation.
 *
 * This is the single owner of the NUI format: signup, profile lookup,
 * business-document lookup, and uniqueness checks all go through here.
 * Kosovo NUI (numri unik identifikues) is the ARBK business registration
 * identifier; the project accepts the documented alphanumeric form of 6–10
 * characters (digits dominate in practice; older registrations may contain
 * letters) and normalizes to one canonical representation (trimmed,
 * upper-cased) so comparisons and uniqueness are stable.
 */

export const NUI_MIN_LENGTH = 6;
export const NUI_MAX_LENGTH = 10;
const NUI_PATTERN = /^[A-Za-z0-9]+$/;

/** Parses/validates raw NUI input; error messages are user-facing and safe. */
export const businessNuiInputSchema = z
  .string()
  .trim()
  .min(NUI_MIN_LENGTH, "Enter your business NUI (at least 6 characters).")
  .max(NUI_MAX_LENGTH, "Business NUI is too long.")
  .regex(NUI_PATTERN, "Business NUI can only contain letters and numbers.");

/**
 * Normalizes raw NUI input to the canonical stored form, or returns null when
 * the input is missing/invalid. Every consumer (signup persistence, profile
 * lookup, document retrieval, uniqueness checks) must use this function so
 * "81023456", " 81023456 ", and "81023456" are the same business identity.
 */
export function normalizeBusinessNui(rawInput: string | null | undefined): string | null {
  if (typeof rawInput !== "string") return null;
  const parsed = businessNuiInputSchema.safeParse(rawInput);
  if (!parsed.success) return null;
  return parsed.data.toUpperCase();
}

/**
 * Parses raw NUI input and throws a user-safe AppError-style validation
 * message for signup paths that must explain why input was rejected.
 */
export function requireValidBusinessNui(rawInput: string | null | undefined): string {
  const normalized = normalizeBusinessNui(rawInput);
  if (!normalized) {
    const parsed = businessNuiInputSchema.safeParse(typeof rawInput === "string" ? rawInput : "");
    throw new NuiValidationError(parsed.error?.issues[0]?.message ?? "Enter your business NUI to complete business registration.");
  }
  return normalized;
}

/** Typed error so callers can distinguish invalid NUI from other failures. */
export class NuiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NuiValidationError";
  }
}

/** Formats a normalized NUI for display (canonical form is already upper-case). */
export function formatBusinessNui(normalizedNui: string): string {
  return normalizedNui.toUpperCase();
}
