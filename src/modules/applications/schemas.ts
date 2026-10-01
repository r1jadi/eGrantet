import { z } from "zod";
import { APPLICATION_STATUSES } from "./types";

export const applicationContractSchema = z.object({
  grantId: z.uuid(),
  status: z.enum(APPLICATION_STATUSES),
  submittedAt: z.iso.datetime().nullable(),
  answers: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => value.status !== "SUBMITTED" || value.submittedAt !== null, {
  message: "Submitted applications require a submission timestamp.", path: ["submittedAt"],
});

export const applicationAnswersSchema = z.record(z.string().min(1).max(100), z.unknown()).refine((answers) => Object.keys(answers).length <= 100, "Too many application answers.");
