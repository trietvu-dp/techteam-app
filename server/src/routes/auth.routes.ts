import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, createSession, verifyPassword } from "../middleware/auth.ts";
import { loginSchema } from "@shared/schema.ts";
import { fromError } from "zod-validation-error";

export const authRouter = Router();

// Login endpoint
authRouter.post('/login', async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({message: fromError(validation.error).toString()});
        }

        console.error(validation)

        const {username, password} = validation.data;

        // Find user by username
        const user = await storage.getUserByUsername(username);
        if (!user || !user.isActive) {
            return res.status(401).json({message: "Invalid credentials"});
        }

        console.log(user)

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({message: "Invalid credentials"});
        }

        // Create session
        const token = await createSession(
            user.id,
            req.ip,
            req.headers['user-agent']
        );

        // Set session cookie
        res.cookie('session', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });

        res.json({
            message: "Login successful",
            user: {id: user.id, username: user.username, email: user.email, role: user.role}
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({message: "Login failed"});
    }
});

// Logout endpoint
authRouter.post('/logout', requireAuth, async (req: any, res) => {
    try {
        if (req.sessionId) {
            await storage.revokeSession(req.sessionId);
        }
        res.clearCookie('session');
        res.json({message: "Logged out successfully"});
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({message: "Logout failed"});
    }
});

// Get current user
authRouter.get('/me', requireAuth, async (req: any, res) => {
    res.json(req.user);
});
