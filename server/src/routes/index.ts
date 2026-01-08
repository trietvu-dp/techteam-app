import type { Express } from "express";
import cookieParser from "cookie-parser";
import { createServer, type Server } from "http";
import { authRouter } from "./auth.routes.ts";
import { adminRouter } from "./admin.routes.ts";
import { schoolsRouter } from "./schools.routes.ts";
import { usersRouter } from "./users.routes.ts";
import { studentRouter } from "./student.routes.ts";
import { ticketsRouter } from "./tickets.routes.ts";
import { workLogsRouter } from "./work-logs.routes.ts";
import { challengesRouter } from "./challenges.routes.ts";
import { resourcesRouter } from "./resources.routes.ts";

export async function registerRoutes(app: Express): Promise<Server> {
    // Setup cookie parser for session management
    app.use(cookieParser());

    // Health check endpoint for Docker/load balancer monitoring
    app.get('/api/health', (_req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    // Register all route modules
    app.use('/api/auth', authRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/schools', schoolsRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/student', studentRouter);
    app.use('/api/tickets', ticketsRouter);
    app.use('/api/work-logs', workLogsRouter);
    app.use('/api/challenges', challengesRouter);
    app.use('/api/resources', resourcesRouter);

    const httpServer = createServer(app);
    return httpServer;
}
