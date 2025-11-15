import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
import mongoose from "mongoose";

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

//middleware
export const errorHandler = ( err: any, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err };
  error.message = err.message;

  const errorContext = {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    statusCode: err.statusCode || 500,
    message: err.message,
    name: err.name,
    stack: err.stack,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
  };
  if (err instanceof mongoose.Error.CastError) {
    const message = "Resource not found";
    error = new AppError(message, 404);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = `${field} already exists`;
    error = new AppError(message, 400);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    const message = messages.join(", ");
    error = new AppError(message, 400);
  }
  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401);
  }
  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401);
  }
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  errorContext.statusCode = statusCode;
  errorContext.message = message;
  if (statusCode >= 500) {
    logger.error(`Server error occurred: ${message}`, errorContext);
  } else {
    logger.warn(`Client error occurred: ${message}`, errorContext);
  }
  const response: any = { success: false, message };
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = {
      name: err.name,
      message: err.message,
    };
  }
  res.status(statusCode).json(response);
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  logger.warn(`404 - ${req.method} ${req.originalUrl} - ${req.ip}`);
  next(error);
};
