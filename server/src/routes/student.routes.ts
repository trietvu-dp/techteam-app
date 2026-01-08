import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireUserSchool } from "../middleware/auth.ts";
import { insertChallengeCompletionSchema } from "@shared/schema.ts";
import { fromError } from "zod-validation-error";

export const studentRouter = Router();

// Get student dashboard stats
studentRouter.get('/dashboard-stats', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;
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
        res.status(500).json({message: "Failed to fetch dashboard stats"});
    }
});

// Get recent activity for student
studentRouter.get('/recent-activity', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        // Get recent tickets assigned to this user
        const allTickets = await storage.getTickets(user.schoolId, {});
        const userTickets = allTickets
            .filter(t => t.assignedTo === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        res.json(userTickets);
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        res.status(500).json({message: "Failed to fetch recent activity"});
    }
});

// Get skills progress by category
studentRouter.get('/skills-progress', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;
        // Get all challenges grouped by category
        const allChallenges = await storage.getChallenges(true);
        const completions = await storage.getUserChallengeCompletions(user.id, user.schoolId);
        const completedChallengeIds = new Set(completions.map(c => c.challengeId));

        // Group by category
        const categories = new Map<string, { total: number; completed: number }>();

        allChallenges.forEach(challenge => {
            const category = challenge.category || 'General';
            if (!categories.has(category)) {
                categories.set(category, {total: 0, completed: 0});
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
        res.status(500).json({message: "Failed to fetch skills progress"});
    }
});

// Get teachers for the student's school (for device check forms)
studentRouter.get('/teachers', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;
        const users = await storage.getUsersBySchool(user.schoolId);

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

// Get student's device checks
studentRouter.get('/device-checks', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        // Get all tickets assigned to this student where issueType = 'check'
        const allTickets = await storage.getTickets(user.schoolId, {});
        const deviceChecks = allTickets
            .filter(t => t.assignedTo === user.id && t.issueType === 'check')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(deviceChecks);
    } catch (error) {
        console.error("Error fetching device checks:", error);
        res.status(500).json({message: "Failed to fetch device checks"});
    }
});

// Get student's repairs
studentRouter.get('/repairs', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        // Get all tickets assigned to this student where issueType = 'repair'
        const allTickets = await storage.getTickets(user.schoolId, {});
        const repairs = allTickets
            .filter(t => t.assignedTo === user.id && t.issueType === 'repair')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(repairs);
    } catch (error) {
        console.error("Error fetching repairs:", error);
        res.status(500).json({message: "Failed to fetch repairs"});
    }
});

// List active challenges with per-user completion status
studentRouter.get('/challenges', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

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
        res.status(500).json({message: "Failed to fetch challenges"});
    }
});

// Mark a challenge complete once and award points
studentRouter.post('/challenges/:id/complete', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const challenge = await storage.getChallenge(req.params.id);
        if (!challenge) {
            return res.status(404).json({message: "Challenge not found"});
        }

        const alreadyCompleted = await storage.isChallengeCompleted(user.id, challenge.id, user.schoolId);
        if (alreadyCompleted) {
            return res.status(409).json({message: "Challenge already completed"});
        }

        const completionData = {
            schoolId: user.schoolId,
            userId: user.id,
            challengeId: challenge.id,
            pointsEarned: challenge.points,
        };

        const validation = insertChallengeCompletionSchema.safeParse(completionData);
        if (!validation.success) {
            return res.status(400).json({message: fromError(validation.error).toString()});
        }

        const completion = await storage.completeChallenge(validation.data);
        const updatedUser = await storage.updateUserPoints(user.id, challenge.points);

        res.status(201).json({completion, points: updatedUser.points});
    } catch (error) {
        console.error("Error completing challenge:", error);
        res.status(500).json({message: "Failed to complete challenge"});
    }
});

// Leaderboard for the user's school (by points)
studentRouter.get('/rankings', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

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
        res.status(500).json({message: "Failed to fetch rankings"});
    }
});
