import { Router } from "express";
import { storage } from "../db/storage.ts";
import { db } from "../db/db.ts";
import * as schemaTypes from "@shared/schema.ts";
import { eq, and } from "drizzle-orm";
import {
    requireAuth,
    requireRole,
    requireSuperAdmin,
    hashPassword
} from "../middleware/auth.ts";
import { insertSchoolSchema } from "@shared/schema.ts";
import { fromError } from "zod-validation-error";

export const adminRouter = Router();

// ============================================
// SUPER ADMIN ENDPOINTS
// ============================================

// Create school (super admin only)
adminRouter.post('/schools', requireAuth, requireRole('super_admin'), async (req, res) => {
    try {
        const validation = insertSchoolSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({message: fromError(validation.error).toString()});
        }

        const school = await storage.createSchool(validation.data);
        res.status(201).json(school);
    } catch (error) {
        console.error("Error creating school:", error);
        res.status(500).json({message: "Failed to create school"});
    }
});

// Get all schools (super admin only)
adminRouter.get('/schools', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const schools = await storage.getAllSchools();
        res.json(schools);
    } catch (error) {
        console.error("Error fetching schools:", error);
        res.status(500).json({message: "Failed to fetch schools"});
    }
});

// Create school admin (super admin only)
adminRouter.post('/school-admins', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const {username, email, password, firstName, lastName, schoolId} = req.body;

        if (!username || !email || !password || !schoolId) {
            return res.status(400).json({message: "username, email, password, and schoolId are required"});
        }

        // Verify school exists
        const school = await storage.getSchool(schoolId);
        if (!school) {
            return res.status(404).json({message: "School not found"});
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create admin user
        const user = await storage.createUser({
            username,
            email,
            passwordHash,
            firstName,
            lastName,
            schoolId,
            role: 'admin',
            points: 0,
            streak: 0,
            selectedAvatar: 'rocket',
            isActive: true,
        });

        res.status(201).json({id: user.id, username: user.username, email: user.email, role: user.role});
    } catch (error) {
        console.error("Error creating school admin:", error);
        res.status(500).json({message: "Failed to create school admin"});
    }
});

// Create student for any school (super admin only)
adminRouter.post('/students', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const {username, email, password, firstName, lastName, schoolId} = req.body;

        if (!username || !email || !password || !schoolId) {
            return res.status(400).json({message: "username, email, password, and schoolId are required"});
        }

        // Verify school exists
        const school = await storage.getSchool(schoolId);
        if (!school) {
            return res.status(404).json({message: "School not found"});
        }

        const passwordHash = await hashPassword(password);

        const user = await storage.createUser({
            username,
            email,
            passwordHash,
            firstName,
            lastName,
            schoolId,
            role: 'student',
            points: 0,
            streak: 0,
            selectedAvatar: 'rocket',
            isActive: true,
        });

        res.status(201).json({id: user.id, username: user.username, email: user.email, role: user.role});
    } catch (error) {
        console.error("Error creating student:", error);
        res.status(500).json({message: "Failed to create student"});
    }
});

// Get all school admins (super admin only)
adminRouter.get('/all-school-admins', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const {schoolId} = req.query;

        // Use a single SQL query with join to get admins with school names
        const adminsWithSchools = await db
            .select({
                id: schemaTypes.users.id,
                username: schemaTypes.users.username,
                email: schemaTypes.users.email,
                firstName: schemaTypes.users.firstName,
                lastName: schemaTypes.users.lastName,
                schoolId: schemaTypes.users.schoolId,
                role: schemaTypes.users.role,
                points: schemaTypes.users.points,
                streak: schemaTypes.users.streak,
                selectedAvatar: schemaTypes.users.selectedAvatar,
                isActive: schemaTypes.users.isActive,
                createdAt: schemaTypes.users.createdAt,
                updatedAt: schemaTypes.users.updatedAt,
                schoolName: schemaTypes.schools.name,
            })
            .from(schemaTypes.users)
            .innerJoin(schemaTypes.schools, eq(schemaTypes.users.schoolId, schemaTypes.schools.id))
            .where(
                schoolId
                    ? and(eq(schemaTypes.users.role, 'admin'), eq(schemaTypes.users.schoolId, schoolId as string))
                    : eq(schemaTypes.users.role, 'admin')
            )
            .orderBy(
                schemaTypes.users.lastName,
                schemaTypes.users.firstName
            );

        res.json(adminsWithSchools);
    } catch (error) {
        console.error("Error fetching school admins:", error);
        res.status(500).json({message: "Failed to fetch school admins"});
    }
});

// Create internal staff user (super admin only)
adminRouter.post('/internal-users', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const {username, email, password, firstName, lastName} = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({message: "username, email, and password are required"});
        }

        const passwordHash = await hashPassword(password);

        const user = await storage.createUser({
            username,
            email,
            passwordHash,
            firstName,
            lastName,
            schoolId: undefined, // Internal users don't belong to a school
            role: 'internal',
            points: 0,
            streak: 0,
            selectedAvatar: 'rocket',
            isActive: true,
        });

        res.status(201).json({id: user.id, username: user.username, email: user.email, role: user.role});
    } catch (error) {
        console.error("Error creating internal user:", error);
        res.status(500).json({message: "Failed to create internal user"});
    }
});

// Get all students (super admin only)
adminRouter.get('/all-students', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const {schoolId} = req.query;

        // Use a single SQL query with join to get students with school names
        const studentsWithSchools = await db
            .select({
                id: schemaTypes.users.id,
                username: schemaTypes.users.username,
                email: schemaTypes.users.email,
                firstName: schemaTypes.users.firstName,
                lastName: schemaTypes.users.lastName,
                schoolId: schemaTypes.users.schoolId,
                role: schemaTypes.users.role,
                points: schemaTypes.users.points,
                streak: schemaTypes.users.streak,
                selectedAvatar: schemaTypes.users.selectedAvatar,
                isActive: schemaTypes.users.isActive,
                createdAt: schemaTypes.users.createdAt,
                updatedAt: schemaTypes.users.updatedAt,
                schoolName: schemaTypes.schools.name,
            })
            .from(schemaTypes.users)
            .innerJoin(schemaTypes.schools, eq(schemaTypes.users.schoolId, schemaTypes.schools.id))
            .where(
                schoolId
                    ? and(eq(schemaTypes.users.role, 'student'), eq(schemaTypes.users.schoolId, schoolId as string))
                    : eq(schemaTypes.users.role, 'student')
            )
            .orderBy(
                schemaTypes.users.lastName,
                schemaTypes.users.firstName
            );

        res.json(studentsWithSchools);
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({message: "Failed to fetch students"});
    }
});
