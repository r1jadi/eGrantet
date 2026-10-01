export {
  runApplicationVerification,
  invalidateDocumentAnalysis,
  getVerificationOverview,
  listRequirementVerifications,
  listDocumentVerificationStatuses,
  type VerificationOverview,
  type RequirementVerificationRow,
  type DocumentVerificationRow,
} from "./services/verification-service";
export {
  REQUIREMENT_VERIFICATION_RESULTS,
  VERIFICATION_SOURCES,
  VERIFICATION_STATUSES,
  evaluateRequirementDeterministically,
  evaluateDocumentRequirement,
  evaluateRequirementWithDocumentEvidence,
  type RequirementEvidence,
  type RequirementVerification,
  type RequirementRuleConfig,
} from "./requirement-evaluation";
export { collectInconsistencies, compareApplicationWithDocument } from "./consistency";
export { detectMissingDocuments } from "./missing-documents";
