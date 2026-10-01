export type AppErrorCode = "VALIDATION" | "AUTHENTICATION" | "AUTHORIZATION" | "NOT_FOUND" | "CONFLICT" | "DATABASE" | "EXTERNAL_SERVICE" | "AI" | "UNKNOWN";

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AppError";
  }
}

export function toSafeErrorMessage(error: unknown): string {
  return error instanceof AppError && error.code === "VALIDATION" ? error.message : "Something went wrong. Please try again.";
}
