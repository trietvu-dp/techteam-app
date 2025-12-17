import type { Express } from "express";
import cookieParser from "cookie-parser";
import { createServer, type Server } from "http";
import { storage } from "../db/storage.ts";
import { db } from "../db/db.ts";
import * as schemaTypes from "@shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, requireSuperAdmin, requireAdminOrSuperAdmin, requireSchoolContext, createSession, hashPassword, verifyPassword, revokeAllUserSessions } from "../middleware/auth.ts";
import { 
  loginSchema,
  insertTicketSchema, 
  insertWorkLogSchema, 
  insertTicketNoteSchema,
  insertChallengeCompletionSchema,
  insertUserSchema,
  insertSchoolSchema 
} from "@shared/schema.ts";
import { fromError } from "zod-validation-error";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup cookie parser for session management
  app.use(cookieParser());

  // ============================================
  // PUBLIC AUTH ENDPOINTS
  // ============================================

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      console.error(validation)

      const { username, password } = validation.data;

      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(user)

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
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

      res.json({ message: "Login successful", user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', requireAuth, async (req: any, res) => {
    try {
      if (req.sessionId) {
        await storage.revokeSession(req.sessionId);
      }
      res.clearCookie('session');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req: any, res) => {
    res.json(req.user);
  });

  // ============================================
  // SUPER ADMIN ENDPOINTS
  // ============================================

  // Create school (super admin only)
  app.post('/api/admin/schools', requireAuth, requireRole('super_admin'), async (req, res) => {
    try {
      const validation = insertSchoolSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const school = await storage.createSchool(validation.data);
      res.status(201).json(school);
    } catch (error) {
      console.error("Error creating school:", error);
      res.status(500).json({ message: "Failed to create school" });
    }
  });

  // Get all schools (super admin only)
  app.get('/api/admin/schools', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const schools = await storage.getAllSchools();
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Create school admin (super admin only)
  app.post('/api/admin/school-admins', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, schoolId } = req.body;

      if (!username || !email || !password || !schoolId) {
        return res.status(400).json({ message: "username, email, password, and schoolId are required" });
      }

      // Verify school exists
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
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

      res.status(201).json({ id: user.id, username: user.username, email: user.email, role: user.role });
    } catch (error) {
      console.error("Error creating school admin:", error);
      res.status(500).json({ message: "Failed to create school admin" });
    }
  });

  // Create student for any school (super admin only)
  app.post('/api/admin/students', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, schoolId } = req.body;

      if (!username || !email || !password || !schoolId) {
        return res.status(400).json({ message: "username, email, password, and schoolId are required" });
      }

      // Verify school exists
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
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

      res.status(201).json({ id: user.id, username: user.username, email: user.email, role: user.role });
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // Get all school admins (super admin only)
  app.get('/api/admin/all-school-admins', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { schoolId } = req.query;
      
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
      res.status(500).json({ message: "Failed to fetch school admins" });
    }
  });

  // Get all students (super admin only)
  app.get('/api/admin/all-students', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { schoolId } = req.query;
      
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
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // ============================================
  // SCHOOL ADMIN ENDPOINTS
  // ============================================

  // Get all students for a school (school admin or super admin)
  app.get('/api/schools/:schoolId/students', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
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
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Get all teachers for a school (authenticated users only)
  app.get('/api/schools/:schoolId/teachers', requireAuth, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
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
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  // Create student (school admin or super admin)
  app.post('/api/schools/:schoolId/students', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const { username, email, password, firstName, lastName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "username, email, and password are required" });
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

      res.status(201).json({ id: user.id, username: user.username, email: user.email, role: user.role });
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // Get all tickets for a school with sorting (school admin or super admin)
  app.get('/api/schools/:schoolId/tickets', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const { sortBy, sortOrder, status, issueType } = req.query;
      
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
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get learning progress for all students in a school (school admin or super admin)
  app.get('/api/schools/:schoolId/learning-progress', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      
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
      res.status(500).json({ message: "Failed to fetch learning progress" });
    }
  });

  // Update student information (school admin or super admin)
  app.patch('/api/schools/:schoolId/students/:studentId', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId, studentId } = req.params;
      const updates = req.body;
      
      // Verify student belongs to this school
      const student = await storage.getUser(studentId);
      if (!student || student.schoolId !== schoolId) {
        return res.status(404).json({ message: "Student not found in this school" });
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
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // Reset student password (school admin or super admin)
  app.post('/api/schools/:schoolId/students/:studentId/reset-password', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId, studentId } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      
      // Verify student belongs to this school
      const student = await storage.getUser(studentId);
      if (!student || student.schoolId !== schoolId) {
        return res.status(404).json({ message: "Student not found in this school" });
      }
      
      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(studentId, { passwordHash });
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Get detailed student view (all tickets, challenges, work logs)
  app.get('/api/schools/:schoolId/students/:studentId/details', requireAuth, requireAdminOrSuperAdmin, requireSchoolContext, async (req: any, res) => {
    try {
      const { schoolId, studentId } = req.params;
      
      // Get student info
      const student = await storage.getUser(studentId);
      if (!student || student.schoolId !== schoolId) {
        return res.status(404).json({ message: "Student not found in this school" });
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
      res.status(500).json({ message: "Failed to fetch student details" });
    }
  });

  // ============================================
  // STUDENT DASHBOARD ENDPOINTS
  // ============================================

  // Get student dashboard stats
  app.get('/api/student/dashboard-stats', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Get all tickets for this student (assigned to them)
      const allTickets = await storage.getTickets(user.schoolId, {});
      const userTickets = allTickets.filter(t => t.assignedTo === user.id);

      // Count checks today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checksToday = userTickets.filter(t => {
        const ticketDate = new Date(t.createdAt);
        return ticketDate >= today;
      }).length;

      // Count active repairs
      const activeRepairs = userTickets.filter(t => 
        t.status === 'in_progress' || t.status === 'pending'
      ).length;

      // Get challenge completions for skills progress
      const completions = await storage.getUserChallengeCompletions(user.id, user.schoolId);
      const allChallenges = await storage.getChallenges(true);
      const skillsProgress = allChallenges.length > 0 
        ? Math.round((completions.length / allChallenges.length) * 100) 
        : 0;

      // Count pending tasks as open tickets (pending or in_progress)
      const pendingTasks = userTickets.filter(t => 
        t.status === 'pending' || t.status === 'in_progress'
      ).length;

      res.json({
        checksToday,
        activeRepairs,
        skillsProgress,
        pendingTasks,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get recent activity for student
  app.get('/api/student/recent-activity', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Get recent tickets assigned to this user
      const allTickets = await storage.getTickets(user.schoolId, {});
      const userTickets = allTickets
        .filter(t => t.assignedTo === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      res.json(userTickets);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Get skills progress by category
  app.get('/api/student/skills-progress', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Get all challenges grouped by category
      const allChallenges = await storage.getChallenges(true);
      const completions = await storage.getUserChallengeCompletions(user.id, user.schoolId);
      const completedChallengeIds = new Set(completions.map(c => c.challengeId));

      // Group by category
      const categories = new Map<string, { total: number; completed: number }>();
      
      allChallenges.forEach(challenge => {
        const category = challenge.category || 'General';
        if (!categories.has(category)) {
          categories.set(category, { total: 0, completed: 0 });
        }
        const cat = categories.get(category)!;
        cat.total++;
        if (completedChallengeIds.has(challenge.id)) {
          cat.completed++;
        }
      });

      // Convert to array with percentages
      const progress = Array.from(categories.entries()).map(([category, data]) => ({
        category,
        total: data.total,
        completed: data.completed,
        percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }));

      res.json(progress);
    } catch (error) {
      console.error("Error fetching skills progress:", error);
      res.status(500).json({ message: "Failed to fetch skills progress" });
    }
  });

  // Get student's device checks
  app.get('/api/student/device-checks', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Get all tickets assigned to this student where issueType = 'check'
      const allTickets = await storage.getTickets(user.schoolId, {});
      const deviceChecks = allTickets
        .filter(t => t.assignedTo === user.id && t.issueType === 'check')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(deviceChecks);
    } catch (error) {
      console.error("Error fetching device checks:", error);
      res.status(500).json({ message: "Failed to fetch device checks" });
    }
  });

  // Get student's repairs
  app.get('/api/student/repairs', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Get all tickets assigned to this student where issueType = 'repair'
      const allTickets = await storage.getTickets(user.schoolId, {});
      const repairs = allTickets
        .filter(t => t.assignedTo === user.id && t.issueType === 'repair')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(repairs);
    } catch (error) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  // ============================================
  // STUDENT CHALLENGES
  // ============================================

  // GET /api/student/challenges - List active challenges with per-user completion status
  app.get('/api/student/challenges', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const allChallenges = await storage.getChallenges(true);
      const completions = await storage.getUserChallengeCompletions(user.id, user.schoolId);
      const completedChallengeIds = new Set(completions.map(c => c.challengeId));

      const challengesWithProgress = allChallenges.map(challenge => ({
        ...challenge,
        isCompleted: completedChallengeIds.has(challenge.id),
        reward: `${challenge.points} pts`,
      }));

      res.json(challengesWithProgress);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // POST /api/student/challenges/:id/complete - Mark a challenge complete once and award points
  app.post('/api/student/challenges/:id/complete', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      const alreadyCompleted = await storage.isChallengeCompleted(user.id, challenge.id, user.schoolId);
      if (alreadyCompleted) {
        return res.status(409).json({ message: "Challenge already completed" });
      }

      const completionData = {
        schoolId: user.schoolId,
        userId: user.id,
        challengeId: challenge.id,
        pointsEarned: challenge.points,
      };

      const validation = insertChallengeCompletionSchema.safeParse(completionData);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const completion = await storage.completeChallenge(validation.data);
      const updatedUser = await storage.updateUserPoints(user.id, challenge.points);

      res.status(201).json({ completion, points: updatedUser.points });
    } catch (error) {
      console.error("Error completing challenge:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });

  // ============================================
  // STUDENT RANKINGS
  // ============================================

  // GET /api/student/rankings - Leaderboard for the user's school (by points)
  app.get('/api/student/rankings', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const limitRaw = req.query.limit as string | undefined;
      const limit = limitRaw ? Math.max(1, Math.min(100, Number.parseInt(limitRaw, 10))) : 10;

      const rankings = await storage.getRankings(user.schoolId, limit);
      const response = rankings
        .filter((u: any) => u.role === 'student')
        .map((u: any) => ({
          rank: u.rank,
          id: u.id,
          name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username,
          points: u.points ?? 0,
          streak: u.streak ?? 0,
          isCurrentUser: u.id === user.id,
        }));

      res.json(response);
    } catch (error) {
      console.error("Error fetching rankings:", error);
      res.status(500).json({ message: "Failed to fetch rankings" });
    }
  });

  // ============================================
  // TICKET ENDPOINTS
  // ============================================

  // GET /api/tickets - List tickets for the user's school (supports basic filters)
  app.get('/api/tickets', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }
      
      const tickets = await storage.getTickets(user.schoolId, {
        status: req.query.status as string | undefined,
        deviceType: req.query.deviceType as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // POST /api/tickets - Create a new ticket in the user's school (forces status=pending)
  app.post('/api/tickets', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Auto-assign ticket to the creating user if not specified
      // Enforce pending status for all new tickets (ignore user-provided status)
      const { status, ...bodyWithoutStatus } = req.body;
      const ticketData = {
        ...bodyWithoutStatus,
        schoolId: user.schoolId,
        assignedTo: req.body.assignedTo || user.id,
        status: 'pending' as const,
      };

      const validation = insertTicketSchema.safeParse(ticketData);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const ticket = await storage.createTicket(validation.data);
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // PATCH /api/tickets/:id - Update a ticket (admin/super_admin or assigned student)
  app.patch('/api/tickets/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      // Verify the ticket exists and belongs to this school
      const existing = await storage.getTicket(req.params.id, user.schoolId);
      if (!existing) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      const isAssignedStudent = user.role === 'student' && existing.assignedTo === user.id;
      if (!isAdmin && !isAssignedStudent) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }

      const ticket = await storage.updateTicket(req.params.id, user.schoolId, req.body);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // ============================================
  // TICKET NOTES
  // ============================================

  // GET /api/tickets/:id/notes - List notes for a ticket (school-scoped)
  app.get('/api/tickets/:id/notes', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const ticket = await storage.getTicket(req.params.id, user.schoolId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const notes = await storage.getTicketNotes(req.params.id, user.schoolId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching ticket notes:", error);
      res.status(500).json({ message: "Failed to fetch ticket notes" });
    }
  });

  // POST /api/tickets/:id/notes - Add a note to a ticket (school-scoped)
  app.post('/api/tickets/:id/notes', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const ticket = await storage.getTicket(req.params.id, user.schoolId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const noteData = {
        ...req.body,
        schoolId: user.schoolId,
        ticketId: req.params.id,
        userId: user.id,
      };

      const validation = insertTicketNoteSchema.safeParse(noteData);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const note = await storage.createTicketNote(validation.data);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating ticket note:", error);
      res.status(500).json({ message: "Failed to create ticket note" });
    }
  });

  // ============================================
  // GET TICKETS BY ID
  // ============================================

  // GET /api/tickets/:id - Fetch a single ticket by id (school-scoped)
  app.get('/api/tickets/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const ticket = await storage.getTicket(req.params.id, user.schoolId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);

    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // DELETE /api/tickets/:id - Delete a ticket (admin/super_admin only, school-scoped)
  app.delete('/api/tickets/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const existing = await storage.getTicket(req.params.id, user.schoolId);
      if (!existing) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      await storage.deleteTicket(req.params.id, user.schoolId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  // GET /api/work-logs - List work logs for the school (students restricted to their own when filtering)
  app.get('/api/work-logs', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const requestedUserId = req.query.userId as string | undefined;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (requestedUserId && !isAdmin && requestedUserId !== user.id) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }

      const logs = await storage.getWorkLogs(user.schoolId, {
        userId: requestedUserId,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });

      res.json(logs);
    } catch (error) {
      console.error("Error fetching work logs:", error);
      res.status(500).json({ message: "Failed to fetch work logs" });
    }
  });

  // POST /api/work-logs - Create a work log for the current user (school-scoped)
  app.post('/api/work-logs', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const logData = {
        ...req.body,
        schoolId: user.schoolId,
        userId: user.id,
      };

      const validation = insertWorkLogSchema.safeParse(logData);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const created = await storage.createWorkLog(validation.data);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating work log:", error);
      res.status(500).json({ message: "Failed to create work log" });
    }
  });

  // PATCH /api/work-logs/:id - Update a work log (admin/super_admin or owner only, school-scoped)
  app.patch('/api/work-logs/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      const visibleLogs = await storage.getWorkLogs(user.schoolId, {
        userId: isAdmin ? undefined : user.id,
      });
      const existing = visibleLogs.find(l => l.id === req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Work log not found" });
      }

      const { id, schoolId, userId, ...rest } = req.body ?? {};
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
        return res.status(404).json({ message: "Work log not found" });
      }
      console.error("Error updating work log:", error);
      res.status(500).json({ message: "Failed to update work log" });
    }
  });

  // DELETE /api/work-logs/:id - Delete a work log (admin/super_admin or owner only, school-scoped)
  app.delete('/api/work-logs/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      const visibleLogs = await storage.getWorkLogs(user.schoolId, {
        userId: isAdmin ? undefined : user.id,
      });
      const existing = visibleLogs.find(l => l.id === req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Work log not found" });
      }

      await storage.deleteWorkLog(req.params.id, user.schoolId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.message === 'Work log not found') {
        return res.status(404).json({ message: "Work log not found" });
      }
      console.error("Error deleting work log:", error);
      res.status(500).json({ message: "Failed to delete work log" });
    }
  });

  // GET /api/resources - List global resources (supports category/contentType/search)
  app.get('/api/resources', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const resources = await storage.getResources({
        category: req.query.category as string | undefined,
        contentType: req.query.contentType as string | undefined,
        search: req.query.search as string | undefined,
      });

      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // GET /api/resources/:id - Fetch a single global resource by id
  app.get('/api/resources/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.schoolId) {
        return res.status(403).json({ message: "User must belong to a school" });
      }

      const resource = await storage.getResource(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      res.json(resource);
    } catch (error) {
      console.error("Error fetching resource:", error);
      res.status(500).json({ message: "Failed to fetch resource" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
