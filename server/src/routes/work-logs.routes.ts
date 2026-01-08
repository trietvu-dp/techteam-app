import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireUserSchool } from "../middleware/auth.ts";
import { insertWorkLogSchema } from "@shared/schema.ts";
import { fromError } from "zod-validation-error";

export const workLogsRouter = Router();

// List work logs for the school (students restricted to their own when filtering)
workLogsRouter.get('/', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const requestedUserId = req.query.userId as string | undefined;
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';

        if (requestedUserId && !isAdmin && requestedUserId !== user.id) {
            return res.status(403).json({message: "Forbidden - Insufficient permissions"});
        }

        const logs = await storage.getWorkLogs(user.schoolId, {
            userId: requestedUserId,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
        });

        res.json(logs);
    } catch (error) {
        console.error("Error fetching work logs:", error);
        res.status(500).json({message: "Failed to fetch work logs"});
    }
});

// Create a work log for the current user (school-scoped)
workLogsRouter.post('/', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const logData = {
            ...req.body,
            schoolId: user.schoolId,
            userId: user.id,
        };

        const validation = insertWorkLogSchema.safeParse(logData);
        if (!validation.success) {
            return res.status(400).json({message: fromError(validation.error).toString()});
        }

        const created = await storage.createWorkLog(validation.data);
        res.status(201).json(created);
    } catch (error) {
        console.error("Error creating work log:", error);
        res.status(500).json({message: "Failed to create work log"});
    }
});

// Update a work log (admin/super_admin or owner only, school-scoped)
workLogsRouter.patch('/:id', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const isAdmin = user.role === 'admin' || user.role === 'super_admin';

        const visibleLogs = await storage.getWorkLogs(user.schoolId, {
            userId: isAdmin ? undefined : user.id,
        });
        const existing = visibleLogs.find(l => l.id === req.params.id);
        if (!existing) {
            return res.status(404).json({message: "Work log not found"});
        }

        const {id, schoolId, userId, ...rest} = req.body ?? {};
        const updates: any = {
            logDate: rest.logDate,
            hoursWorked: rest.hoursWorked,
            category: rest.category,
            description: rest.description,
        };

        Object.keys(updates).forEach((key) => {
            if (updates[key] === undefined) delete updates[key];
        });

        const updated = await storage.updateWorkLog(req.params.id, user.schoolId, updates);
        res.json(updated);
    } catch (error: any) {
        if (error?.message === 'Work log not found') {
            return res.status(404).json({message: "Work log not found"});
        }
        console.error("Error updating work log:", error);
        res.status(500).json({message: "Failed to update work log"});
    }
});

// Delete a work log (admin/super_admin or owner only, school-scoped)
workLogsRouter.delete('/:id', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const isAdmin = user.role === 'admin' || user.role === 'super_admin';

        const visibleLogs = await storage.getWorkLogs(user.schoolId, {
            userId: isAdmin ? undefined : user.id,
        });
        const existing = visibleLogs.find(l => l.id === req.params.id);
        if (!existing) {
            return res.status(404).json({message: "Work log not found"});
        }

        await storage.deleteWorkLog(req.params.id, user.schoolId);
        res.status(204).send();
    } catch (error: any) {
        if (error?.message === 'Work log not found') {
            return res.status(404).json({message: "Work log not found"});
        }
        console.error("Error deleting work log:", error);
        res.status(500).json({message: "Failed to delete work log"});
    }
});
