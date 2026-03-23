import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../services/prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    privyId: string;
    email: string | null;
    walletAddress: string | null;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.substring(7);
    
    // In production, verify with Privy
    // For now, we'll decode the JWT and find/create the user
    const decoded = jwt.decode(token) as { sub?: string; email?: string } | null;
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { privyId: decoded.sub },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          privyId: decoded.sub,
          email: decoded.email || null,
        },
      });
    }

    req.user = {
      id: user.id,
      privyId: user.privyId,
      email: user.email,
      walletAddress: user.walletAddress,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
}
