import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireRole, requireUserSchool } from "../middleware/auth.ts";
import { insertTicketSchema, insertTicketNoteSchema } from "@shared/schema.ts";
import { fromError } from "zod-validation-error";

export const ticketsRouter = Router();

// List tickets for the user's school (supports basic filters)
ticketsRouter.get('/', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const tickets = await storage.getTickets(user.schoolId, {
            status: req.query.status as string | undefined,
            deviceType: req.query.deviceType as string | undefined,
            search: req.query.search as string | undefined,
        });
        res.json(tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({message: "Failed to fetch tickets"});
    }
});

// Create a new ticket in the user's school (forces status=pending)
ticketsRouter.post('/', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        // Auto-assign ticket to the creating user if not specified
        // Enforce pending status for all new tickets (ignore user-provided status)
        const {status, ...bodyWithoutStatus} = req.body;
        const ticketData = {
            ...bodyWithoutStatus,
            schoolId: user.schoolId,
            assignedTo: req.body.assignedTo || user.id,
            status: 'pending' as const,
        };

        const validation = insertTicketSchema.safeParse(ticketData);
        if (!validation.success) {
            return res.status(400).json({message: fromError(validation.error).toString()});
        }

        const ticket = await storage.createTicket(validation.data);
        res.status(201).json(ticket);
    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({message: "Failed to create ticket"});
    }
});

// Fetch a single ticket by id (school-scoped)
ticketsRouter.get('/:id', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const ticket = await storage.getTicket(req.params.id, user.schoolId);
        if (!ticket) {
            return res.status(404).json({message: "Ticket not found"});
        }

        res.json(ticket);

    } catch (error) {
        console.error("Error fetching ticket:", error);
        res.status(500).json({message: "Failed to fetch ticket"});
    }
});

// Update a ticket (admin/super_admin or assigned student)
ticketsRouter.patch('/:id', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        // Verify the ticket exists and belongs to this school
        const existing = await storage.getTicket(req.params.id, user.schoolId);
        if (!existing) {
            return res.status(404).json({message: "Ticket not found"});
        }

        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        const isAssignedStudent = user.role === 'student' && existing.assignedTo === user.id;
        if (!isAdmin && !isAssignedStudent) {
            return res.status(403).json({message: "Forbidden - Insufficient permissions"});
        }

        const ticket = await storage.updateTicket(req.params.id, user.schoolId, req.body);
        res.json(ticket);
    } catch (error) {
        console.error("Error updating ticket:", error);
        res.status(500).json({message: "Failed to update ticket"});
    }
});

// Delete a ticket (admin/super_admin only, school-scoped)
ticketsRouter.delete('/:id', requireAuth, requireUserSchool, requireRole('admin', 'super_admin'), async (req: any, res) => {
    try {
        const user = req.user;

        const existing = await storage.getTicket(req.params.id, user.schoolId);
        if (!existing) {
            return res.status(404).json({message: "Ticket not found"});
        }

        await storage.deleteTicket(req.params.id, user.schoolId);
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting ticket:", error);
        res.status(500).json({message: "Failed to delete ticket"});
    }
});

// List notes for a ticket (school-scoped)
ticketsRouter.get('/:id/notes', requireAuth, requireUserSchool,  async (req: any, res) => {
    try {
        const user = req.user;

        const ticket = await storage.getTicket(req.params.id, user.schoolId);
        if (!ticket) {
            return res.status(404).json({message: "Ticket not found"});
        }

        const notes = await storage.getTicketNotes(req.params.id, user.schoolId);
        res.json(notes);
    } catch (error) {
        console.error("Error fetching ticket notes:", error);
        res.status(500).json({message: "Failed to fetch ticket notes"});
    }
});

// Add a note to a ticket (school-scoped)
ticketsRouter.post('/:id/notes', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const ticket = await storage.getTicket(req.params.id, user.schoolId);
        if (!ticket) {
            return res.status(404).json({message: "Ticket not found"});
        }

        const noteData = {
            ...req.body,
            schoolId: user.schoolId,
            ticketId: req.params.id,
            userId: user.id,
        };

        const validation = insertTicketNoteSchema.safeParse(noteData);
        if (!validation.success) {
            return res.status(400).json({message: fromError(validation.error).toString()});
        }

        const note = await storage.createTicketNote(validation.data);
        res.status(201).json(note);
    } catch (error) {
        console.error("Error creating ticket note:", error);
        res.status(500).json({message: "Failed to create ticket note"});
    }
});

