import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

export const requestLogger = (
  req: Request,res: Response,next: NextFunction
): void => {
  const start = Date.now();
  //request
  logger.http(
    `Incoming ${req.method} ${req.originalUrl} - IP: ${req.ip || req.socket.remoteAddress}`
  );
  //response
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warn" : "http";

    logger.log(logLevel, {
      message: `Outgoing ${req.method} ${req.originalUrl}`,
      status: res.statusCode, duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
    });
  });
  next();
};

