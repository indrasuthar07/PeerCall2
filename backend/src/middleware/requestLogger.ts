import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    referer: req.get("referer"),
    contentType: req.get("content-type"),
    contentLength: req.get("content-length"),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  };
  logger.http(`Incoming request: ${req.method} ${req.originalUrl}`, requestInfo);
  res.on("finish", () => {
    const duration = Date.now() - start;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: res.get("content-length"),
    };
    if (res.statusCode >= 500) {
      logger.error(`Request failed with server error: ${req.method} ${req.originalUrl}`, responseInfo);
    } else if (res.statusCode >= 400) {
      logger.warn(`Request failed with client error: ${req.method} ${req.originalUrl}`, responseInfo);
    } else {
      logger.http(`Request completed successfully: ${req.method} ${req.originalUrl}`, responseInfo);
    }
  });
  next();
};
