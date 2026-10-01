"use server";

import { z } from "zod";
import { createDraftApplication, submitApplication, updateDraftApplication, updateMunicipalApplicationStatus } from "../services/application-service";
import { APPLICATION_STATUSES } from "../types";

const idSchema = z.uuid();

export async function createDraftApplicationAction(grantId: string) { return createDraftApplication(idSchema.parse(grantId)); }
export async function updateDraftApplicationAction(applicationId: string, answers: unknown) { return updateDraftApplication(idSchema.parse(applicationId), answers); }
export async function submitApplicationAction(applicationId: string) { return submitApplication(idSchema.parse(applicationId)); }
export async function updateMunicipalApplicationStatusAction(applicationId: string, status: unknown, message?: string) { return updateMunicipalApplicationStatus(idSchema.parse(applicationId), z.enum(APPLICATION_STATUSES).parse(status), message); }
