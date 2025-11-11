import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import roomRoutes from "./routes/roomRoutes.js";
import passport from "passport";
import "./utils/passport.js"
import cookieParser from 'cookie-parser';
import cors from "cors";
import logger from "./utils/logger.js";
dotenv.config();
const app = express();

app.use(requestLogger);
app.use(express.json());
app.use(cookieParser()); // <-- Add this middleware HERE
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5174",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
//initialize passport
app.use(passport.initialize());
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/rooms", roomRoutes);

// Error Handler
app.use(errorHandler);

logger.info("Express app initialized");
export default app;
