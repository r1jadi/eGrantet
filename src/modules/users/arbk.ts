import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { businessNuiSchema } from "./schemas";
import { arbkSampleNuis, type ArbkBusiness, type ArbkDocument } from "./arbk-contract";

/**
 * ARBK business registry adapter (Kosovo Business Registration Agency).
 * The real adapter will call ARBK once API access is provisioned; the sample
 * adapter below keeps the contract stable until then. Response validation,
 * sample records, and the shared types live in the pure `arbk-contract`
 * module.
 */
export { arbkBusinessSchema, arbkSampleNuis } from "./arbk-contract";
export type { ArbkBusiness, ArbkDocument } from "./arbk-contract";

export async function fetchArbkBusinessByNui(nui: string): Promise<ArbkBusiness> {
  const parsed = businessNuiSchema.safeParse(nui);
  if (!parsed.success) throw new AppError("VALIDATION", "The business NUI is not valid.");
  const normalized = parsed.data.toUpperCase();
  // TODO: replace with the real ARBK API adapter once credentials are provisioned.
  const record = arbkSampleNuis[normalized];
  if (!record) throw new AppError("NOT_FOUND", "No ARBK business record was found for this NUI.");
  return record;
}

export async function fetchArbkDocumentsByNui(nui: string): Promise<ArbkDocument[]> {
  const business = await fetchArbkBusinessByNui(nui);
  void business;
  // TODO: real ARBK document feed; registry-sourced sample documents for now.
  return [
    { id: "arbk-registration", name: "Certificate of registration", type: "Registration certificate", issuedOn: "2021-03-15" },
    { id: "arbk-status", name: "Proof of active status", type: "Status confirmation", issuedOn: "2026-08-01" },
  ];
}
