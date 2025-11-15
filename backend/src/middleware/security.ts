import type { Request, Response, NextFunction } from "express";

export const sanitizeInput = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const isOAuthRoute = req.path.includes("/google") || req.path.includes("/github");
    if (isOAuthRoute) {
      return next();
    }
    if (req.body && typeof req.body === "object") {
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === "string") {
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === "object") {
          const sanitized: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const cleanKey = key.replace(/[$]/g, "_").replace(/\./g, "_");
              sanitized[cleanKey] = sanitizeObject(obj[key]);
              
              if (cleanKey !== key && process.env.NODE_ENV === "production") {
                console.warn(`Sanitized input key "${key}" from IP: ${req.ip}`);
              }
            }
          }
          return sanitized;
        }
        return obj;
      };
      req.body = sanitizeObject(req.body);
    }
    next();
  };
};

export const sanitizeStrings = (req: Request, res: Response, next: NextFunction) => {
  const isOAuthRoute = req.path.includes("/google") || req.path.includes("/github");
  if (isOAuthRoute) {
    return next();
  }
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === "string") {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};
