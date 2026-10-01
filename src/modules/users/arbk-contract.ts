import { z } from "zod";

/**
 * ARBK (Kosovo Business Registration Agency) registry contract — pure module.
 *
 * Kept free of server-only imports so the response contract can be pinned by
 * unit tests; the server adapter (arbk.ts) re-exports these.
 */

export const arbkBusinessSchema = z.object({
  nui: z.string(),
  businessName: z.string(),
  businessType: z.string(),
  registrationDate: z.string(),
  businessActivity: z.string(),
  address: z.string(),
  municipality: z.string(),
  status: z.string(),
  owner: z.string(),
});

export type ArbkBusiness = z.infer<typeof arbkBusinessSchema>;

export interface ArbkDocument {
  id: string;
  name: string;
  type: string;
  issuedOn: string;
}

/** Sample registry records the adapter responds to; real NUIs come from ARBK. */
export const arbkSampleNuis: Record<string, ArbkBusiness> = {
  "81023456": {
    nui: "81023456",
    businessName: "Rruga Verde SHPK",
    businessType: "Limited liability company (SH.P.K.)",
    registrationDate: "2021-03-15",
    businessActivity: "Landscaping and public space maintenance",
    address: "Rr. Agim Ramadani, Prishtinë",
    municipality: "Prishtinë",
    status: "Active",
    owner: "Arben Krasniqi",
  },
  "70011223": {
    nui: "70011223",
    businessName: "Baleta Design",
    businessType: "Sole proprietorship (person fizik)",
    registrationDate: "2019-11-02",
    businessActivity: "Graphic and spatial design services",
    address: "Rr. Mother Teresa 12, Prizren",
    municipality: "Prizren",
    status: "Active",
    owner: "Elira Baleta",
  },
};
