import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireUserSchool } from "../middleware/auth.ts";

export const challengesRouter = Router();

// Get all challenges with optional filter
challengesRouter.get('/', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const isActiveFilter = req.query.isActive as string | undefined;
        
        let isActive: boolean | undefined;
        if (isActiveFilter !== undefined) {
            isActive = isActiveFilter === 'true';
        }

        const challenges = await storage.getChallenges(isActive);
        res.json(challenges);
    } catch (error) {
        console.error("Error fetching challenges:", error);
        res.status(500).json({message: "Failed to fetch challenges"});
    }
})

// Get active challenges with completion status
challengesRouter.get('/active', requireAuth, requireUserSchool, async (req: any, res) => {
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
        console.error("Error fetching active challenges:", error);
        res.status(500).json({message: "Failed to fetch active challenges"});
    }
})

// Get recommended challenges
challengesRouter.get('/recommended', requireAuth, requireUserSchool, async (req: any, res) => {
    try {
        const user = req.user;

        const recommended = await storage.getRecommendedChallenges(user.id, user.schoolId);
        res.json(recommended);
    } catch (error) {
        console.error("Error fetching recommended challenges:", error);
        res.status(500).json({message: "Failed to fetch recommended challenges"});
    }
})

// Get challenge by ID
challengesRouter.get('/:id', requireAuth, async (req: any, res) => {
    try {
        const {id} = req.params;

        const challenge = await storage.getChallenge(id);
        if (!challenge) {
            return res.status(404).json({message: "Challenge not found"});
        }

        res.json(challenge);
    } catch (error) {
        console.error("Error fetching challenge:", error);
        res.status(500).json({message: "Failed to fetch challenge"});
    }
})
