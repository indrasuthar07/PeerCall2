import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { sanitizeInput, sanitizeStrings } from "./middleware/security.js";
import roomRoutes from "./routes/roomRoutes.js";
import passport from "passport";
import "./utils/passport.js";
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = express();

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", true);
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, 
  })
);
app.use(requestLogger);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5174",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(sanitizeInput());
app.use(sanitizeStrings);
app.use("/api", generalRateLimiter);
app.use(passport.initialize());
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/rooms", roomRoutes);

// 404 handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
