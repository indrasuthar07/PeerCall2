import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
export const errorHandler = (
  err: Error | AppError,req: Request,res: Response,next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const errorDetails = {
    message: err.message,statusCode,stack: err.stack,path: req.originalUrl,method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    userId: (req as any).userId || "anonymous",
  };
  if (statusCode >= 500) {
    logger.error("Server Error", errorDetails);
  } else if (statusCode >= 400) {
    logger.warn("Client Error", errorDetails);
  } else {
    logger.info("Error", errorDetails);
  }
  const isDevelopment = process.env.NODE_ENV === "development";
  const message =
    isDevelopment || isOperational
      ? err.message
      : "An unexpected error occurred. Please try again later.";

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment && { stack: err.stack }),
  });
};
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
