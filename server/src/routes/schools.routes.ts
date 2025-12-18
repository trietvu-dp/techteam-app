import { Router } from "express";
import { storage } from "../db/storage.ts";
import {
    requireAuth,
    requireAdminOrSuperAdmin,
    requireSchoolContext,
    requireUserSchool,
    hashPassword
} from "../middleware/auth.ts";
import bcrypt from "bcrypt";

export const schoolsRouter = Router();

// ============================================
// SCHOOL ADMIN ENDPOINTS
// ============================================

// Get all students for a school (school admin or super admin)
schoolsRouter.get('/:schoolId/students', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId} = req.params;
        const students = await storage.getUsersBySchool(schoolId);

        // Filter to only students and sort alphabetically
        const studentUsers = students
            .filter(u => u.role === 'student')
            .sort((a, b) => {
                const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
                const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
                return nameA.localeCompare(nameB);
            });

        res.json(studentUsers);
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({message: "Failed to fetch students"});
    }
});

// Get all teachers for a school (authenticated users only)
schoolsRouter.get('/:schoolId/teachers', requireAuth, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId} = req.params;
        const users = await storage.getUsersBySchool(schoolId);

        // Filter to only teachers (admin role) and sort alphabetically
        const teachers = users
            .filter(u => u.role === 'admin')
            .sort((a, b) => {
                const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
                const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
                return nameA.localeCompare(nameB);
            })
            .map(teacher => ({
                id: teacher.id,
                firstName: teacher.firstName,
                lastName: teacher.lastName,
                username: teacher.username,
                email: teacher.email,
            }));

        res.json(teachers);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({message: "Failed to fetch teachers"});
    }
});

// Create student (school admin or super admin)
schoolsRouter.post('/:schoolId/students', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId} = req.params;
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

// Get all tickets for a school with sorting (school admin or super admin)
schoolsRouter.get('/:schoolId/tickets', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId} = req.params;
        const {sortBy, sortOrder, status, issueType} = req.query;

        const tickets = await storage.getTickets(schoolId, {
            status: status as string | undefined,
        });

        // Filter by issue type if provided
        let filteredTickets = tickets;
        if (issueType) {
            filteredTickets = tickets.filter(t => t.issueType === issueType);
        }

        // Sort tickets
        if (sortBy === 'date') {
            filteredTickets.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
        } else if (sortBy === 'student') {
            filteredTickets.sort((a, b) => {
                return sortOrder === 'asc'
                    ? a.studentName.localeCompare(b.studentName)
                    : b.studentName.localeCompare(a.studentName);
            });
        }

        res.json(filteredTickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({message: "Failed to fetch tickets"});
    }
});

// Get learning progress for all students in a school (school admin or super admin)
schoolsRouter.get('/:schoolId/learning-progress', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId} = req.params;

        // Get all students in school
        const students = await storage.getUsersBySchool(schoolId);
        const studentUsers = students.filter(u => u.role === 'student');

        // Get challenge completions for each student
        const progress = await Promise.all(
            studentUsers.map(async (student) => {
                const completions = await storage.getUserChallengeCompletions(student.id, schoolId);
                return {
                    student: {
                        id: student.id,
                        username: student.username,
                        firstName: student.firstName,
                        lastName: student.lastName,
                        email: student.email,
                    },
                    challengesCompleted: completions.length,
                    completions: completions,
                };
            })
        );

        // Sort by student name
        progress.sort((a, b) => {
            const nameA = `${a.student.lastName || ''} ${a.student.firstName || ''}`.trim();
            const nameB = `${b.student.lastName || ''} ${b.student.firstName || ''}`.trim();
            return nameA.localeCompare(nameB);
        });

        res.json(progress);
    } catch (error) {
        console.error("Error fetching learning progress:", error);
        res.status(500).json({message: "Failed to fetch learning progress"});
    }
});

// Update student information (school admin or super admin)
schoolsRouter.patch('/:schoolId/students/:studentId', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId, studentId} = req.params;
        const updates = req.body;

        // Verify student belongs to this school
        const student = await storage.getUser(studentId);
        if (!student || student.schoolId !== schoolId) {
            return res.status(404).json({message: "Student not found in this school"});
        }

        // Don't allow password updates through this endpoint
        delete updates.passwordHash;
        delete updates.id;
        delete updates.schoolId;
        delete updates.role;

        // Update student
        const updatedStudent = await storage.updateUser(studentId, updates);
        res.json(updatedStudent);
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({message: "Failed to update student"});
    }
});

// Reset student password (school admin or super admin)
schoolsRouter.post('/:schoolId/students/:studentId/reset-password', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId, studentId} = req.params;
        const {newPassword} = req.body;

        if (!newPassword) {
            return res.status(400).json({message: "New password is required"});
        }

        // Verify student belongs to this school
        const student = await storage.getUser(studentId);
        if (!student || student.schoolId !== schoolId) {
            return res.status(404).json({message: "Student not found in this school"});
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(studentId, {passwordHash});

        res.json({message: "Password reset successfully"});
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({message: "Failed to reset password"});
    }
});

// Get detailed student view (all tickets, challenges, work logs)
schoolsRouter.get('/:schoolId/students/:studentId/details', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
        const {schoolId, studentId} = req.params;

        // Get student info
        const student = await storage.getUser(studentId);
        if (!student || student.schoolId !== schoolId) {
            return res.status(404).json({message: "Student not found in this school"});
        }

        // Get all tickets assigned to or created by this student
        const allTickets = await storage.getTickets(schoolId, {});
        const studentTickets = allTickets.filter(t => t.assignedTo === studentId);

        // Separate device checks and repairs
        const deviceChecks = studentTickets.filter(t => t.issueType === 'check');
        const repairs = studentTickets.filter(t => t.issueType === 'repair');

        // Get challenge completions
        const challengeCompletions = await storage.getUserChallengeCompletions(studentId, schoolId);

        // Get work logs
        const workLogs = await storage.getWorkLogsByUser(studentId, schoolId);

        res.json({
            student: {
                id: student.id,
                username: student.username,
                email: student.email,
                firstName: student.firstName,
                lastName: student.lastName,
                points: student.points,
                streak: student.streak,
                role: student.role,
                selectedAvatar: student.selectedAvatar,
                createdAt: student.createdAt,
            },
            deviceChecks: {
                total: deviceChecks.length,
                completed: deviceChecks.filter(t => t.status === 'completed').length,
                inProgress: deviceChecks.filter(t => t.status === 'in_progress').length,
                pending: deviceChecks.filter(t => t.status === 'pending').length,
                tickets: deviceChecks,
            },
            repairs: {
                total: repairs.length,
                completed: repairs.filter(t => t.status === 'completed').length,
                inProgress: repairs.filter(t => t.status === 'in_progress').length,
                pending: repairs.filter(t => t.status === 'pending').length,
                tickets: repairs,
            },
            learningModules: {
                total: challengeCompletions.length,
                completions: challengeCompletions,
            },
            workLogs: {
                total: workLogs.length,
                logs: workLogs,
            },
        });
    } catch (error) {
        console.error("Error fetching student details:", error);
        res.status(500).json({message: "Failed to fetch student details"});
    }
});

// Get school by ID
schoolsRouter.get('/:id', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;
        const {id} = req.params;
        const isSuperAdmin = user.role === 'super_admin';

        if (!isSuperAdmin && id !== user.schoolId) {
            return res.status(403).json({message: "Forbidden - Insufficient permissions"});
        }

        const school = await storage.getSchool(id);
        if (!school) {
            return res.status(404).json({message: "School not found"});
        }

        res.json(school);
    } catch (error) {
        console.error("Error fetching school:", error);
        res.status(500).json({message: "Failed to fetch school"});
    }
});

// Update school
schoolsRouter.put('/:id', requireAuth, requireUserSchool, requireAdminOrSuperAdmin, async (req: any, res) => {
    try {
        const user = req.user;
        const {id} = req.params;
        const isSuperAdmin = user.role === 'super_admin';

        if (!isSuperAdmin && id !== user.schoolId) {
            return res.status(403).json({message: "Forbidden - Insufficient permissions"});
        }

        const school = await storage.getSchool(id);
        if (!school) {
            return res.status(404).json({message: "School not found"});
        }

        const allowedUpdates: any = {};
        if (req.body.name !== undefined) allowedUpdates.name = req.body.name;
        if (req.body.address !== undefined) allowedUpdates.address = req.body.address;
        if (req.body.contactEmail !== undefined) allowedUpdates.contactEmail = req.body.contactEmail;
        if (req.body.adminName !== undefined) allowedUpdates.adminName = req.body.adminName;

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({message: "No valid fields to update"});
        }

        const updatedSchool = await storage.updateSchool(id, allowedUpdates);
        res.json(updatedSchool);
    } catch (error) {
        console.error("Error updating school:", error);
        res.status(500).json({message: "Failed to update school"});
    }
});
