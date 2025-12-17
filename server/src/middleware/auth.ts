import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../db/storage.ts";

const SALT_ROUNDS = 12;
const SESSION_EXPIRY_HOURS = 12;

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify a password against a hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate a secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Create a session for a user
export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

  await storage.createSession({
    userId,
    token,
    ipAddress,
    userAgent,
    expiresAt,
    revokedAt: undefined,
  });

  return token;
}

// Middleware to require authentication
export async function requireAuth(req: any, res: Response, next: NextFunction) {
  try {
    // Get session token from cookie or Authorization header
    const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No session token" });
    }

    // Validate session
    const session = await storage.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ message: "Unauthorized - Invalid session" });
    }

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      return res.status(401).json({ message: "Unauthorized - Session expired" });
    }

    // Check if session is revoked
    if (session.revokedAt) {
      return res.status(401).json({ message: "Unauthorized - Session revoked" });
    }

    // Get user
    const user = await storage.getUser(session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized - User not found or inactive" });
    }

    // Attach user to request
    req.user = user;
    req.sessionId = session.id;
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Middleware to require specific role
export function requireRole(...roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }

    next();
  };
}

// Helper middleware to require super admin role
export const requireSuperAdmin = requireRole('super_admin');

// Helper middleware to require school admin or super admin
export const requireAdminOrSuperAdmin = requireRole('admin', 'super_admin');

// Middleware to ensure school context matches user's school (unless super admin)
export function requireSchoolContext(req: any, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Super admins can access any school
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Get schoolId from route params or request body
  const requestedSchoolId = req.params.schoolId || req.body.schoolId;
  
  if (!requestedSchoolId) {
    return res.status(400).json({ message: "School ID is required" });
  }

  // Check if user's school matches requested school
  if (req.user.schoolId !== requestedSchoolId) {
    return res.status(403).json({ message: "Forbidden - Access denied to this school's data" });
  }

  next();
}

// Revoke a session
export async function revokeSession(sessionId: string) {
  await storage.revokeSession(sessionId);
}

// Revoke all user sessions
export async function revokeAllUserSessions(userId: string) {
  await storage.revokeAllUserSessions(userId);
}
