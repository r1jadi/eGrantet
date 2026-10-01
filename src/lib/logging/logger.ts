import "server-only";

type LogContext = Record<string, string | number | boolean | undefined>;

function write(level: "info" | "warn" | "error", event: string, context: LogContext = {}) {
  console[level](JSON.stringify({ level, event, ...context, timestamp: new Date().toISOString() }));
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
