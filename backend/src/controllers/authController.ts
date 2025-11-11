import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { type IUser } from "../models/userModel.js";
import {
  generateToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import { userSchema, loginSchema } from "../utils/validateInputs.js";
import dotenv from "dotenv";
import { Session } from "../models/sessionModel.js";
import logger from "../utils/logger.js";

dotenv.config();

const asTypedUser = (user: any): IUser & { _id: string } =>
  user as IUser & { _id: string };

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function createSessionForAccessToken(userId: string, token: string) {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 15 * 60 * 1000);

  await Session.create({
    userId,
    token,
    expiresAt,
  });
}

//signup controller
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parseResult = userSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message,
      });
    }

    const { email, password } = parseResult.data;
    const name = email.split("@")[0];

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });
    const typedUser = asTypedUser(newUser);

    // Generate tokens
    const accessToken = generateToken(typedUser._id.toString());
    const refreshToken = generateRefreshToken(typedUser._id.toString());

    typedUser.refreshTokens = [refreshToken];
    await typedUser.save();

    res.cookie("jwt", refreshToken, cookieOptions);

    //a session document 
    await createSessionForAccessToken(typedUser._id.toString(), accessToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

//login controller
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message || "Validation error",
      });
    }

    const { email, password } = parseResult.data;
    const foundUser = await User.findOne({ email });
    if (!foundUser)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    if (!foundUser.password || foundUser.password === "") {
      return res.status(400).json({
        success: false,
        message:
          "This account was registered via SSO. Please sign in with Google or GitHub.",
      });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const typedUser = asTypedUser(foundUser);

    // Generate tokens
    const accessToken = generateToken(typedUser._id.toString());
    const refreshToken = generateRefreshToken(typedUser._id.toString());

    // Store refresh token
    typedUser.refreshTokens = [refreshToken];
    await typedUser.save();

    // Set cookie
    res.cookie("jwt", refreshToken, cookieOptions);

    // Create session
    await createSessionForAccessToken(typedUser._id.toString(), accessToken);

    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

//refresh token controller
export const handleRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized, no token" });
    }

    const refreshToken = cookies.jwt;
    // Clear the old cookie immediately
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });

    const foundUser = await User.findOne({ refreshTokens: refreshToken });

    if (!foundUser) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET as string
        ) as { id: string };

        const compromisedUser = await User.findById(decoded.id);
        if (compromisedUser) {
          compromisedUser.refreshTokens = [];
          await compromisedUser.save();
        }
      } catch (err) {
        // nothing to do
      } finally {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden, token reuse" });
      }
    }

    const typedUser = asTypedUser(foundUser);

    try {
      // Verify
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as {
        id: string;
      };

      // Generate new tokens
      const newAccessToken = generateToken(typedUser._id.toString());
      const newRefreshToken = generateRefreshToken(typedUser._id.toString());

      const otherRefreshTokens =
        typedUser.refreshTokens?.filter((rt) => rt !== refreshToken) || [];

      typedUser.refreshTokens = [...otherRefreshTokens, newRefreshToken];
      await typedUser.save();

      //new refresh cookie
      res.cookie("jwt", newRefreshToken, cookieOptions);

      //new session
      await createSessionForAccessToken(typedUser._id.toString(), newAccessToken);

      return res.json({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (err) {
      typedUser.refreshTokens =
        typedUser.refreshTokens?.filter((rt) => rt !== refreshToken) || [];
      await typedUser.save();

      return res
        .status(403)
        .json({ success: false, message: "Forbidden, token invalid or expired" });
    }
  } catch (err) {
    next(err);
  }
};

//logout controller
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cookies = req.cookies;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(" ")[1];

    // If cookie exists- remove refresh token
    if (cookies?.jwt) {
      const refreshToken = cookies.jwt;
      const foundUser = await User.findOne({ refreshTokens: refreshToken });
      if (foundUser) {
        foundUser.refreshTokens =
          foundUser.refreshTokens?.filter((rt) => rt !== refreshToken) || [];
        await foundUser.save();
      }

      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development",
      });
    }
    if (accessToken) {
      await Session.deleteOne({ token: accessToken });
    }

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

 //get profile controller
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).userId).select("-password -refreshTokens");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error("Error fetching user profile", { error, userId: (req as any).userId });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};