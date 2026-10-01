import { z } from "zod";
import { GRANT_STATUSES, REQUIREMENT_TYPES } from "./types";

export const grantContractSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).default(""),
  status: z.enum(GRANT_STATUSES),
  fundingAmount: z.number().nonnegative().nullable(),
  maximumAmountPerApplicant: z.number().nonnegative().nullable(),
  fundingCurrency: z.string().length(3).toUpperCase().nullable(),
  applicationDeadline: z.iso.datetime().nullable(),
}).refine((value) => (value.fundingAmount === null) === (value.fundingCurrency === null), {
  message: "Funding amount and currency must be provided together.", path: ["fundingAmount"],
});

export const grantRequirementContractSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5_000).default(""),
  type: z.enum(REQUIREMENT_TYPES),
  isRequired: z.boolean(),
  configuration: z.record(z.string(), z.unknown()).default({}),
  displayOrder: z.number().int().nonnegative().default(0),
});

export const grantDiscoverySchema = z.object({ search: z.string().trim().max(100).optional(), municipalityId: z.uuid().optional(), active: z.coerce.boolean().optional(), minFunding: z.coerce.number().nonnegative().optional(), maxFunding: z.coerce.number().nonnegative().optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });

export const municipalityGrantFilterSchema = z.object({ search: z.string().trim().max(100).optional(), status: z.enum(GRANT_STATUSES).optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(50).default(10) });

export const reorderRequirementsSchema = z.object({ requirementIds: z.array(z.uuid()).min(1).max(50) });
