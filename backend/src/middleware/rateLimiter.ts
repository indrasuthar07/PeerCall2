import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import logger from "../utils/logger.js";

interface RateLimitRequest extends Request {
  rateLimit?: {
    resetTime?: number;
    limit?: number;
    current?: number;
    remaining?: number;
  };
}
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  standardHeaders: true, 
  legacyHeaders: false, 
  handler: (req: RateLimitRequest, res: Response) => {
    const clientIP = req.ip || req.socket.remoteAddress || "unknown";
    logger.warn("Rate limit exceeded for authentication", {
      ip: clientIP,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get("user-agent"),
    });
    
    const retryAfter = req.rateLimit?.resetTime 
      ? Math.round((req.rateLimit.resetTime - Date.now()) / 1000)
      : 900; 
    
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again after 15 minutes.",
      retryAfter,
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: RateLimitRequest, res: Response) => {
    const clientIP = req.ip || req.socket.remoteAddress || "unknown";
    logger.warn("General rate limit exceeded", {
      ip: clientIP,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get("user-agent"),
    });
    
    const retryAfter = req.rateLimit?.resetTime 
      ? Math.round((req.rateLimit.resetTime - Date.now()) / 1000)
      : 900;
    
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP. Please try again later.",
      retryAfter,
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});
