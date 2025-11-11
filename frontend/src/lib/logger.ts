type LogLevel = "error" | "warn" | "info" | "debug";
interface LogEntry {
 level: LogLevel; message: string; timestamp: string; context?: Record<string, any>; error?: Error;
}
class Logger {
  private isDevelopment: boolean;
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }
  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const errorStr = error ? ` Error: ${error.message}${error.stack ? `\n${error.stack}` : ""}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${errorStr}`;
  }
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const formattedMessage = this.formatMessage(level, message, context, error);
    if (this.isDevelopment) {
      switch (level) {
        case "error":
          console.error(formattedMessage, context || "", error || "");
          break;
        case "warn":
          console.warn(formattedMessage, context || "");
          break;
        case "info":
          console.info(formattedMessage, context || "");
          break;
        case "debug":
          console.debug(formattedMessage, context || "");
          break;
      }
    } else {
      if (level === "error" || level === "warn") {
        console.error(formattedMessage, context || "", error || "");
      }
    }
    if (level === "error" && error) {
      this.sendErrorToBackend(message, error, context);
    }
  }
  private async sendErrorToBackend(
    message: string,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      if (!this.isDevelopment) {
        const errorData = {
          message,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          context: {
            ...context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        };
        await fetch("/api/logs/error", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(errorData),
        }).catch(() => {});
      }
    } catch (sendError) { }
  }
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log("error", message, context, error);
  }
  warn(message: string, context?: Record<string, any>): void {
    this.log("warn", message, context);
  }
  info(message: string, context?: Record<string, any>): void {
    this.log("info", message, context);
  }
  debug(message: string, context?: Record<string, any>): void {
    this.log("debug", message, context);
  }
}
export const logger = new Logger();
export default logger;
